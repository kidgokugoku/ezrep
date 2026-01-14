#!/bin/bash
set -e

VERSION=$(grep '"version"' src/manifest.json | sed 's/.*: "\(.*\)".*/\1/')
OUTPUT_DIR="dist"
OUTPUT_FILE="$OUTPUT_DIR/ezrep-v$VERSION.xpi"

echo "Building ezrep v$VERSION..."

mkdir -p "$OUTPUT_DIR"
rm -f "$OUTPUT_FILE"

cd src
zip -r "../$OUTPUT_FILE" . -x "*.DS_Store" -x "__MACOSX/*"
cd ..

echo "✅ Built: $OUTPUT_FILE"
echo "   Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
