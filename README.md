# 🌿 Welcome to EKOVIZIJA

Step into the world of **EKOVIZIJA** — a forward-thinking project built to simulate how human actions (like building cities or cutting down forests) can impact pollution levels. Whether you're an environmental enthusiast or a curious developer, this guide will help you set up and run the project with ease.

---

## 📚 Table of Contents

1. [📖 Introduction](#-introduction)
2. [⚙️ Prerequisites](#️-prerequisites)
3. [🚀 Installation](#-installation)
4. [🧪 Running the Project](#-running-the-project)
5. [🐞 Troubleshooting](#-troubleshooting)
6. [🤝 Contributing](#-contributing)

---

## 📖 Introduction

**EKOVIZIJA** is primarily built with **Python** and powered by **Flask** on the backend. It delivers an interactive experience via **HTML, CSS, and JavaScript** on the frontend.

Our mission: to raise awareness about environmental change through a simulated ecosystem that reacts to your choices.

---

## ⚙️ Prerequisites

Make sure you have the following installed on your machine:

- **Python 3.11+**
- **pip** (Python package manager)

---

## 🚀 Installation

Get up and running with just a few commands:

1. **Clone the Repository**

```bash
git clone https://github.com/JanBremec/EkoVizija.git
cd EkoVizija
```

2. **Install Dependencies**

```bash
pip install -r requirements.txt
```

3. **Add required files**
In the folder *models* add the folowing files:
- model_ch4_ppb.joblib
- model_co_ppb.joblib
- model_no2_ppb.joblib
- model_o3_ppb.joblib
- model_so2_ppb.joblib

In the folder *air_quality* add the following files:
- all_data.csv
- all_data_changed.csv

The files are available on 10.5281/zenodo.15207219

---

## 🧪 Running the Project

Once everything is installed, you can start the app with:

```bash
python main.py
```

> Replace `main.py` with your actual entry point if it’s different.

Visit `http://127.0.0.1:5000` in your browser to start exploring EKOVIZIJA!

---

## 🐞 Troubleshooting

Running into issues? Here are a few tips:

- Double-check that all dependencies were installed without errors.
- Confirm your Python version is **3.11+**.
- Check the terminal for any error messages.
- Try running in a virtual environment for a clean setup.

---

## 🤝 Contributing

We’re open to contributions from anyone! Here's how to get started:

1. **Fork** the repository.
2. **Create** a new branch for your feature or fix.
3. **Commit** your changes with a meaningful message.
4. **Open** a pull request with a clear description.

Let’s build something meaningful together! 🌍

---

Thanks for being a part of EKOVIZIJA!
