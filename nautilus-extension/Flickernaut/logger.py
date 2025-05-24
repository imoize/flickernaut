import logging

# Set to True for development only
FLICKERNAUT_DEBUG: bool = False


class FlickernautFormatter(logging.Formatter):
    def format(self, record):
        record.msg = f"[Flickernaut] [{record.levelname}] : {record.msg}"
        return super().format(record)


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.hasHandlers():
        handler = logging.StreamHandler()
        handler.setFormatter(FlickernautFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if FLICKERNAUT_DEBUG else logging.WARNING)
    return logger
