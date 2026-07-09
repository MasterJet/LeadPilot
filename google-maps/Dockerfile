FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install browsers
RUN playwright install chromium

# Copy project files
COPY . .

# Create data directories
RUN mkdir -p data/exports data/videos

# Run the script
CMD ["python", "main.py"]
