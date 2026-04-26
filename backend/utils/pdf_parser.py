"""
PDF text extraction utility using PyMuPDF.
"""

import fitz  # PyMuPDF
from io import BytesIO


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text content from a PDF file.
    
    Args:
        pdf_bytes: Raw PDF file bytes
        
    Returns:
        Extracted text as a string
    """
    text_parts = []
    
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text.strip():
                text_parts.append(text.strip())
        
        doc.close()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")
    
    if not text_parts:
        raise ValueError("No text content found in PDF. The file may be image-based.")
    
    return "\n\n".join(text_parts)
