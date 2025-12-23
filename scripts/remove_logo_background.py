#!/usr/bin/env python3
"""
Remove white background from logo and create circular transparent mask
"""

from PIL import Image, ImageDraw
import sys

def remove_background(input_path, output_path):
    # load image
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # create circular mask
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)

    # draw circle (diameter = min dimension)
    diameter = min(width, height)
    center_x = width // 2
    center_y = height // 2
    radius = (diameter // 2) - 5  # 5px smaller

    # draw filled circle
    draw.ellipse(
        (center_x - radius, center_y - radius,
         center_x + radius, center_y + radius),
        fill=255
    )

    # apply mask
    img.putalpha(mask)

    # save
    img.save(output_path, "PNG")
    print(f"Saved transparent logo to {output_path}")

if __name__ == "__main__":
    input_file = "/home/kevinjin/mrover.org/public/logos/new_logo.png"
    output_file = "/home/kevinjin/mrover.org/public/logos/new_logo_transparent.png"

    remove_background(input_file, output_file)
