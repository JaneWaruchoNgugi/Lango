from dataclasses import dataclass, field


@dataclass
class PipelineConfig:
    """Per-document-type pipeline step flags."""
    do_boundary_detect: bool = True
    do_perspective_warp: bool = True
    do_deskew: bool = True
    do_clahe: bool = True
    denoise_h: int = 10          # 0 = skip denoise; passport uses 5 (lighter)
    do_sharpen: bool = True      # Passport sets False (MRZ fine print + artefacts)
    do_threshold: bool = True
    # Tesseract PSM mode (6 = block of text, 7 = single line for MRZ)
    tesseract_psm: int = 6
    # Whitelist for strict character sets (empty string = no whitelist)
    tesseract_whitelist: str = ""
    # Minimum acceptable average confidence (0–100 int, Tesseract native scale)
    min_avg_confidence: int = 30


NATIONAL_ID_CONFIG = PipelineConfig(
    do_boundary_detect=True,
    do_perspective_warp=True,
    do_deskew=True,
    do_clahe=True,
    denoise_h=10,
    do_sharpen=True,
    do_threshold=True,
    tesseract_psm=6,
    tesseract_whitelist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/- ",
)

PASSPORT_CONFIG = PipelineConfig(
    do_boundary_detect=True,
    do_perspective_warp=True,
    do_deskew=True,
    do_clahe=True,
    denoise_h=5,        # lighter — preserve fine MRZ lines
    do_sharpen=False,   # sharpening adds artefacts on fine MRZ print
    do_threshold=True,
    tesseract_psm=6,
    tesseract_whitelist="",
)

DRIVER_LICENSE_CONFIG = PipelineConfig(
    do_boundary_detect=True,
    do_perspective_warp=True,
    do_deskew=True,
    do_clahe=True,
    denoise_h=10,
    do_sharpen=True,
    do_threshold=True,
    tesseract_psm=6,
    tesseract_whitelist="",
)
