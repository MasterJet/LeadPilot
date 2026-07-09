# Use the official Playwright image which includes Python and all browser dependencies
FROM mcr.microsoft.com/playwright/python:v1.43.0-jammy

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install browsers
RUN playwright install chromium

# Copy the rest of the application
COPY . .

# Command to run the API
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
