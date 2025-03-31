import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import matplotlib.pyplot as plt
from skimage import io, transform
import os
from torchvision import transforms
from tqdm import tqdm

# Set random seed for reproducibility
torch.manual_seed(42)


## 1. Data Preparation for Color Images
class ColorSatelliteDataset(Dataset):
    def __init__(self, image_dir, sequence_length=3, transform=None):
        """
        Args:
            image_dir: Directory with all the satellite images
            sequence_length: Number of images in each sequence (including target)
            transform: Optional transform to be applied
        """
        self.image_dir = image_dir
        self.transform = transform
        self.sequence_length = sequence_length

        # Get all image files and sort them by date
        self.image_files = sorted([f for f in os.listdir(image_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])

        # Calculate number of sequences
        self.num_sequences = len(self.image_files) - sequence_length + 1

    def __len__(self):
        return self.num_sequences

    def __getitem__(self, idx):
        # Load sequence of images
        images = []
        for i in range(self.sequence_length):
            img_path = os.path.join(self.image_dir, self.image_files[idx + i])
            img = io.imread(img_path)

            # Handle 4-channel (RGBA) images by dropping alpha channel
            if len(img.shape) == 3 and img.shape[2] == 4:
                img = img[:, :, :3]  # Keep only RGB channels

            # Resize and normalize to [0, 1]
            img = transform.resize(img, (256, 256))
            img = img.astype(np.float32)

            if self.transform:
                img = self.transform(img)
            else:
                img = torch.from_numpy(img).permute(2, 0, 1)  # Change to CxHxW format

            images.append(img)

        # Stack input images (first two) along batch dimension
        input_images = torch.stack(images[:2], dim=0)  # Shape: [2, 3, 256, 256]
        target_image = images[2]  # Shape: [3, 256, 256]

        return input_images, target_image


## 2. Model Architecture for Color Images
class ColorSatellitePredictor(nn.Module):
    def __init__(self):
        super(ColorSatellitePredictor, self).__init__()

        # Encoder for each image
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 128x128
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 64x64
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)  # 32x32
        )

        # Combiner network
        self.combiner = nn.Sequential(
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.ReLU()
        )

        # Decoder network
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2),  # 64x64
            nn.ReLU(),
            nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2),  # 128x128
            nn.ReLU(),
            nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2),  # 256x256
            nn.ReLU(),
            nn.Conv2d(32, 3, kernel_size=3, padding=1),
            nn.Sigmoid()  # Output between 0 and 1
        )

    def forward(self, x):
        # x shape: [batch_size, 2, 3, 256, 256]
        batch_size = x.shape[0]

        # Process first image
        img1 = x[:, 0]  # [batch, 3, 256, 256]
        img1 = self.encoder(img1)  # [batch, 128, 32, 32]

        # Process second image
        img2 = x[:, 1]  # [batch, 3, 256, 256]
        img2 = self.encoder(img2)  # [batch, 128, 32, 32]

        # Combine features
        combined = torch.cat([img1, img2], dim=1)  # [batch, 256, 32, 32]
        combined = self.combiner(combined)

        # Decode to predicted image
        predicted = self.decoder(combined)  # [batch, 3, 256, 256]

        return predicted


## 3. Training Setup
def train_model(data_dir, num_epochs=10, batch_size=4):
    # Transform for color images
    transform = transforms.Compose([
        transforms.ToTensor(),
    ])

    dataset = ColorSatelliteDataset(image_dir=data_dir, transform=transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = ColorSatellitePredictor().to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Training loop with progress bar
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        progress_bar = tqdm(enumerate(dataloader), total=len(dataloader), desc=f'Epoch {epoch + 1}/{num_epochs}')

        for i, (inputs, targets) in progress_bar:
            inputs, targets = inputs.to(device), targets.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            progress_bar.set_postfix({'loss': f'{running_loss / (i + 1):.4f}'})

    print('Training finished')
    return model


## 4. Color Visualization
def visualize_color_prediction(model, data_dir, device='cpu'):
    dataset = ColorSatelliteDataset(image_dir=data_dir)
    inputs, target = dataset[0]

    model.eval()
    with torch.no_grad():
        inputs = inputs.unsqueeze(0).to(device)  # Add batch dimension
        prediction = model(inputs).squeeze().cpu().numpy()

    # Convert from CxHxW to HxWxC for visualization
    input1 = inputs[0, 0].cpu().numpy().transpose(1, 2, 0)
    input2 = inputs[0, 1].cpu().numpy().transpose(1, 2, 0)
    prediction = prediction.transpose(1, 2, 0)
    target = target.numpy().transpose(1, 2, 0)

    # Clip values to [0, 1] in case of small numerical errors
    input1 = np.clip(input1, 0, 1)
    input2 = np.clip(input2, 0, 1)
    prediction = np.clip(prediction, 0, 1)
    target = np.clip(target, 0, 1)

    plt.figure(figsize=(15, 5))

    plt.subplot(1, 4, 1)
    plt.imshow(input1)
    plt.title('Year 1')
    plt.axis('off')

    plt.subplot(1, 4, 2)
    plt.imshow(input2)
    plt.title('Year 2')
    plt.axis('off')

    plt.subplot(1, 4, 3)
    plt.imshow(prediction)
    plt.title('Predicted Year 3')
    plt.axis('off')

    plt.subplot(1, 4, 4)
    plt.imshow(target)
    plt.title('Actual Year 3')
    plt.axis('off')

    plt.tight_layout()
    plt.show()


## 5. Main Execution
if __name__ == "__main__":
    data_dir = '../satellite_images'

    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"Created directory {data_dir}. Please add your satellite images there.")
        print("For now, creating synthetic example images...")

        size = (256, 256, 3)
        for year in [1, 2, 3]:
            img = np.zeros(size)

            # Create colored features that change over time
            # Blue water body that expands
            img[100:120, 100:100 + year * 30, 2] = 0.8  # Blue channel

            # Gray urban area that grows
            urban_value = 0.3 + year * 0.1
            img[50:50 + year * 10, 50:50 + year * 10, :] = urban_value  # All channels

            # Green vegetation that changes
            img[150:180, 150:180, 1] = 0.6 - year * 0.1  # Green channel

            plt.imsave(f'{data_dir}/year_{year}.png', img)

    image_files = [f for f in os.listdir(data_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]
    if len(image_files) < 3:
        raise ValueError(f"Need at least 3 images in {data_dir}, found {len(image_files)}")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    try:
        model = train_model(data_dir, num_epochs=5, batch_size=4)
        visualize_color_prediction(model, data_dir, device)
    except Exception as e:
        print(f"Error: {str(e)}")
        print("Please check your image files and try again.")