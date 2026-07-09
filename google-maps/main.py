import logging
from config import Config
from scraper.maps_scraper import MapsScraper
from storage.database import Database
from storage.csv_exporter import CSVExporter

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting Google Maps Scraper...")
    
    # 1. Initialize Config and Directories
    Config.ensure_dirs()
    logger.info(f"Configuration: BUSINESS={Config.BUSINESS}, CITY={Config.CITY}, MAX_RESULTS={Config.MAX_RESULTS}")

    # 2. Initialize Database
    db = Database()

    # 3. Start Scraper
    scraper = MapsScraper()
    raw_data = scraper.scrape()

    if not raw_data:
        logger.warning("No data extracted. Shutting down.")
        return

    # 4. Save to Database
    logger.info(f"Saving {len(raw_data)} records to database...")
    for item in raw_data:
        db.insert_business(item)

    # 5. Export to CSV
    # Re-fetch from DB to ensure we export the structured data as saved
    export_data = db.get_all_for_export(Config.CITY, Config.BUSINESS)
    
    filename = f"{Config.BUSINESS.replace(' ', '_')}_{Config.CITY.replace(' ', '_')}.csv"
    CSVExporter.export(export_data, filename)

    logger.info("Extraction complete.")

if __name__ == "__main__":
    main()
