#include <emscripten/emscripten.h>
#include <string>
#include <cstring>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/sha.h>

// XOR-based encryption with PBKDF2 key derivation
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    char* encrypt_data(const char* plaintext, const char* password) {
        try {
            int plaintext_len = strlen(plaintext);
            int password_len = strlen(password);
            
            // Generate random salt
            unsigned char salt[16];
            if (!RAND_bytes(salt, sizeof(salt))) {
                return nullptr;
            }
            
            // Derive key using PBKDF2
            unsigned char key[32];
            if (!PKCS5_PBKDF2_HMAC(password, password_len, salt, sizeof(salt), 
                                   100000, EVP_sha256(), sizeof(key), key)) {
                return nullptr;
            }
            
            // Allocate result buffer (salt + IV + ciphertext + tag)
            int result_size = 16 + 16 + plaintext_len + 16;
            unsigned char* result = new unsigned char[result_size];
            int pos = 0;
            
            // Store salt
            memcpy(result + pos, salt, 16);
            pos += 16;
            
            // Generate IV
            unsigned char iv[16];
            if (!RAND_bytes(iv, sizeof(iv))) {
                delete[] result;
                return nullptr;
            }
            memcpy(result + pos, iv, 16);
            pos += 16;
            
            // Encrypt using AES-256-CBC
            EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
            int len = 0;
            int ciphertext_len = 0;
            
            if (!EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), nullptr, key, iv)) {
                EVP_CIPHER_CTX_free(ctx);
                delete[] result;
                return nullptr;
            }
            
            if (!EVP_EncryptUpdate(ctx, result + pos, &len, 
                                  (unsigned char*)plaintext, plaintext_len)) {
                EVP_CIPHER_CTX_free(ctx);
                delete[] result;
                return nullptr;
            }
            ciphertext_len = len;
            
            if (!EVP_EncryptFinal_ex(ctx, result + pos + len, &len)) {
                EVP_CIPHER_CTX_free(ctx);
                delete[] result;
                return nullptr;
            }
            ciphertext_len += len;
            pos += ciphertext_len;
            
            EVP_CIPHER_CTX_free(ctx);
            
            // Add HMAC-SHA256 tag
            unsigned char tag[32];
            unsigned int tag_len;
            HMAC(EVP_sha256(), key, sizeof(key), result, pos, tag, &tag_len);
            memcpy(result + pos, tag, 16);
            pos += 16;
            
            // Convert to base64
            static char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            char* encoded = new char[(pos * 4 / 3) + 4];
            int enc_pos = 0;
            
            for (int i = 0; i < pos; i += 3) {
                int b1 = result[i];
                int b2 = (i + 1 < pos) ? result[i + 1] : 0;
                int b3 = (i + 2 < pos) ? result[i + 2] : 0;
                
                encoded[enc_pos++] = base64_chars[(b1 >> 2) & 0x3F];
                encoded[enc_pos++] = base64_chars[((b1 & 0x03) << 4) | ((b2 >> 4) & 0x0F)];
                
                if (i + 1 < pos) {
                    encoded[enc_pos++] = base64_chars[((b2 & 0x0F) << 2) | ((b3 >> 6) & 0x03)];
                } else {
                    encoded[enc_pos++] = '=';
                }
                
                if (i + 2 < pos) {
                    encoded[enc_pos++] = base64_chars[b3 & 0x3F];
                } else {
                    encoded[enc_pos++] = '=';
                }
            }
            encoded[enc_pos] = '\0';
            
            delete[] result;
            return encoded;
        } catch (...) {
            return nullptr;
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    char* decrypt_data(const char* ciphertext_b64, const char* password) {
        try {
            // Decode base64
            int ciphertext_len = 0;
            unsigned char* ciphertext = new unsigned char[strlen(ciphertext_b64)];
            
            int val = 0;
            int bits = -6;
            for (int i = 0; ciphertext_b64[i]; i++) {
                int c = ciphertext_b64[i];
                if (c >= 'A' && c <= 'Z') val = (val << 6) + (c - 'A');
                else if (c >= 'a' && c <= 'z') val = (val << 6) + (c - 'a' + 26);
                else if (c >= '0' && c <= '9') val = (val << 6) + (c - '0' + 52);
                else if (c == '+') val = (val << 6) + 62;
                else if (c == '/') val = (val << 6) + 63;
                else if (c == '=') { bits -= 2; continue; }
                else continue;
                
                bits += 6;
                if (bits >= 0) {
                    ciphertext[ciphertext_len++] = (val >> bits) & 255;
                }
            }
            
            if (ciphertext_len < 48) {
                delete[] ciphertext;
                return nullptr;
            }
            
            // Extract components
            unsigned char* salt = ciphertext;
            unsigned char* iv = ciphertext + 16;
            unsigned char* encrypted = ciphertext + 32;
            int encrypted_len = ciphertext_len - 48;
            unsigned char* tag = ciphertext + ciphertext_len - 16;
            
            // Derive key
            unsigned char key[32];
            if (!PKCS5_PBKDF2_HMAC(password, strlen(password), salt, 16, 
                                   100000, EVP_sha256(), sizeof(key), key)) {
                delete[] ciphertext;
                return nullptr;
            }
            
            // Verify HMAC
            unsigned char computed_tag[32];
            unsigned int tag_len;
            HMAC(EVP_sha256(), key, sizeof(key), ciphertext, ciphertext_len - 16, 
                 computed_tag, &tag_len);
            
            bool tag_valid = true;
            for (int i = 0; i < 16; i++) {
                if (computed_tag[i] != tag[i]) tag_valid = false;
            }
            
            if (!tag_valid) {
                delete[] ciphertext;
                return nullptr;
            }
            
            // Decrypt
            EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
            char* plaintext = new char[encrypted_len + 1];
            int len = 0;
            int plaintext_len = 0;
            
            if (!EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), nullptr, key, iv)) {
                EVP_CIPHER_CTX_free(ctx);
                delete[] ciphertext;
                delete[] plaintext;
                return nullptr;
            }
            
            if (!EVP_DecryptUpdate(ctx, (unsigned char*)plaintext, &len, encrypted, encrypted_len)) {
                EVP_CIPHER_CTX_free(ctx);
                delete[] ciphertext;
                delete[] plaintext;
                return nullptr;
            }
            plaintext_len = len;
            
            if (!EVP_DecryptFinal_ex(ctx, (unsigned char*)plaintext + len, &len)) {
                EVP_CIPHER_CTX_free(ctx);
                delete[] ciphertext;
                delete[] plaintext;
                return nullptr;
            }
            plaintext_len += len;
            plaintext[plaintext_len] = '\0';
            
            EVP_CIPHER_CTX_free(ctx);
            delete[] ciphertext;
            
            return plaintext;
        } catch (...) {
            return nullptr;
        }
    }
    
    EMSCRIPTEN_KEEPALIVE
    void free_memory(char* ptr) {
        delete[] ptr;
    }
}