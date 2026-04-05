"""Simple scheduler for periodic polling scraper."""
import time
import threading
from datetime import datetime

from ..api.polls import scrape_polls


def run_scraper():
    """Run the scraper and log results."""
    print(f"[{datetime.now()}] Running poll scraper...")
    try:
        scrape_polls()
        print(f"[{datetime.now()}] Scraper finished")
    except Exception as e:
        print(f"[{datetime.now()}] Scraper error: {e}")


class PollScraperScheduler:
    def __init__(self, interval_minutes: int = 15):
        self.interval = interval_minutes * 60
        self.running = False
        
    def start(self):
        """Start the scheduler in a background thread."""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_loop)
        self.thread.daemon = True
        self.thread.start()
        print(f"Scheduler started, scraping every {self.interval // 60} minutes")
        
    def _run_loop(self):
        while self.running:
            run_scraper()
            # Wait in small intervals to allow stopping
            for _ in range(self.interval):
                if not self.running:
                    break
                time.sleep(1)
            
    def stop(self):
        self.running = False


if __name__ == "__main__":
    scheduler = PollScraperScheduler(interval_minutes=15)
    scheduler.start()
    # Keep main thread alive
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.stop()
