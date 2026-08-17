#!/bin/bash

# Compile C++ to WebAssembly
emcc crypto.cpp -o crypto.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_encrypt_data","_decrypt_data","_free_memory"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -O3 \
  -lssl -lcrypto

echo "✅ WebAssembly compilation complete!"
echo "Generated files: crypto.js, crypto.wasm"