#!/bin/bash

# Fix Tailwind CSS canonical class names
# bg-gradient-to-* -> bg-linear-to-*

find src -type f \( -name "*.astro" -o -name "*.tsx" -o -name "*.jsx" \) -exec sed -i 's/bg-gradient-to-/bg-linear-to-/g' {} +

echo "Fixed bg-gradient-to-* -> bg-linear-to-*"
