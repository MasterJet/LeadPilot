import csv
import os
from config import Config

class CSVExporter:
    @staticmethod
    def export(data, filename):
        if not data:
            print("No data to export.")
            return

        filepath = os.path.join(Config.EXPORT_DIR, filename)
        keys = data[0].keys()

        with open(filepath, 'w', newline='', encoding='utf-8') as output_file:
            dict_writer = csv.DictWriter(output_file, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(data)
        
        print(f"Data exported to {filepath}")
        return filepath
