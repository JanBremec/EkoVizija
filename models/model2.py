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
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.cuda.amp import GradScaler, autocast

# Set random seed for reproducibility
torch.manual_seed(42)


## 1. Data Preparation with Fixed Dimensions
class SatelliteDataset(Dataset):
    def __init__(self, image_dir, sequence_length=3, transform=None, augment=False):
        self.image_dir = image_dir
        self.transform = transform
        self.sequence_length = sequence_length
        self.augment = augment

        self.image_files = sorted([f for f in os.listdir(image_dir) if f.endswith(('.png', '.jpg', '.jpeg'))])
        self.num_sequences = len(self.image_files) - sequence_length + 1

        # Augmentation transforms
        self.augment_transforms = transforms.Compose([
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
        ])

    def __len__(self):
        return self.num_sequences

    def __getitem__(self, idx):
        images = []
        for i in range(self.sequence_length):
            img_path = os.path.join(self.image_dir, self.image_files[idx + i])
            img = io.imread(img_path)

            if len(img.shape) == 3 and img.shape[2] == 4:
                img = img[:, :, :3]  # Drop alpha channel

            img = transform.resize(img, (256, 256))
            img = img.astype(np.float32)

            if self.transform:
                img = self.transform(img)
            else:
                img = torch.from_numpy(img).permute(2, 0, 1)  # CHW format

            if self.augment and i < self.sequence_length - 1:  # Don't augment target
                img = self.augment_transforms(img)

            images.append(img)

        input_images = torch.stack(images[:2], dim=0)  # [2, 3, 256, 256]
        target_image = images[2]  # [3, 256, 256]

        return input_images, target_image


## 2. Fixed Model Architecture
class SatellitePredictor(nn.Module):
    def __init__(self):
        super(SatellitePredictor, self).__init__()

        # Shared encoder
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2),
            nn.MaxPool2d(2),  # 128x128

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2),
            nn.MaxPool2d(2),  # 64x64

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2),
            nn.MaxPool2d(2)  # 32x32
        )

        # Feature combiner
        self.combiner = nn.Sequential(
            nn.Conv2d(512, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2)
        )

        # Decoder
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2),  # 64x64
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2),

            nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2),  # 128x128
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2),

            nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2),  # 256x256
            nn.BatchNorm2d(32),
            nn.LeakyReLU(0.2),

            nn.Conv2d(32, 3, kernel_size=3, padding=1),
            nn.Sigmoid()
        )

    def forward(self, x):
        # Process both images
        img1 = self.encoder(x[:, 0])  # [batch, 256, 32, 32]
        img2 = self.encoder(x[:, 1])  # [batch, 256, 32, 32]

        # Combine features
        combined = torch.cat([img1, img2], dim=1)  # [batch, 512, 32, 32]
        combined = self.combiner(combined)  # [batch, 256, 32, 32]

        # Decode to prediction
        predicted = self.decoder(combined)  # [batch, 3, 256, 256]

        return predicted


## 3. Training Setup
def train_model(data_dir, num_epochs=15, batch_size=8):
    transform = transforms.Compose([
        transforms.ToTensor(),
    ])

    train_dataset = SatelliteDataset(
        image_dir=data_dir,
        transform=transform,
        augment=True
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        pin_memory=True
    )

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = SatellitePredictor().to(device)

    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = ReduceLROnPlateau(optimizer, 'min', patience=3, factor=0.5)
    scaler = GradScaler()

    best_loss = float('inf')
    for epoch in range(num_epochs):
        model.train()
        epoch_loss = 0.0
        progress_bar = tqdm(train_loader, desc=f'Epoch {epoch + 1}/{num_epochs}')

        for inputs, targets in progress_bar:
            inputs, targets = inputs.to(device), targets.to(device)

            optimizer.zero_grad()

            with autocast():
                outputs = model(inputs)
                loss = criterion(outputs, targets)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            epoch_loss += loss.item()
            progress_bar.set_postfix({'loss': f'{epoch_loss / (progress_bar.n + 1):.4f}'})

        avg_loss = epoch_loss / len(train_loader)
        scheduler.step(avg_loss)

        if avg_loss < best_loss:
            best_loss = avg_loss
            torch.save(model.state_dict(), '../best_model.pth')

    print('Training finished')
    return model


## 4. Visualization
def visualize_prediction(model, data_dir, device='cpu'):
    model.load_state_dict(torch.load('../best_model.pth', map_location=device))
    model.eval()

    dataset = SatelliteDataset(image_dir=data_dir)
    inputs, target = dataset[0]

    with torch.no_grad():
        inputs = inputs.unsqueeze(0).to(device)
        prediction = model(inputs).squeeze().cpu().numpy()

    input1 = inputs[0, 0].cpu().numpy().transpose(1, 2, 0)
    input2 = inputs[0, 1].cpu().numpy().transpose(1, 2, 0)
    prediction = prediction.transpose(1, 2, 0)
    target = target.numpy().transpose(1, 2, 0)

    # Calculate PSNR
    mse = np.mean((prediction - target) ** 2)
    psnr = -10 * np.log10(mse)

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
    plt.title(f'Predicted\nPSNR: {psnr:.2f} dB')
    plt.axis('off')

    plt.subplot(1, 4, 4)
    plt.imshow(target)
    plt.title('Actual')
    plt.axis('off')

    plt.tight_layout()
    plt.show()


## 5. Main Execution
if __name__ == "__main__":
    data_dir = '../satellite_images'

    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"Created directory {data_dir}. Please add your satellite images there.")
        print("Creating synthetic example images...")

        size = (256, 256, 3)
        for year in [1, 2, 3]:
            img = np.zeros(size)

            # Water body
            img[100:120, 100:100 + year * 30, 2] = 0.8  # Blue

            # Urban area
            urban_size = 30 + year * 10
            img[50:50 + urban_size, 50:50 + urban_size, :] = 0.3 + year * 0.05

            # Vegetation
            img[150:180, 150:180, 1] = 0.6 - year * 0.1  # Green

            plt.imsave(f'{data_dir}/year_{year}.png', img)

    image_files = [f for f in os.listdir(data_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]
    if len(image_files) < 3:
        raise ValueError(f"Need at least 3 images in {data_dir}, found {len(image_files)}")

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    try:
        model = train_model(data_dir)
        visualize_prediction(model, data_dir, device)
    except Exception as e:
        print(f"Error: {str(e)}")
        print("Please ensure your images are RGB and properly formatted.")