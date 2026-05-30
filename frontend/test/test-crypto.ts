/// <reference types="node" />
import { deriveKeysFromConfig, encryptWithKeys, decryptWithKeys } from '../src/lib/crypto'

// ===== Helpers (hanya untuk test) =====

function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte)
    return btoa(binary)
}

function arraysEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
    const ua = new Uint8Array(a)
    const ub = new Uint8Array(b)
    return ua.length === ub.length && ua.every((v, i) => v === ub[i])
}

// ===== Key Generation (sama persis dengan GenerateKey.tsx) =====

async function generateKeyFromPassword(password: string) {
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])

    const derivedBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: new Uint8Array(), iterations: 100000, hash: 'SHA-256' },
        passwordKey,
        512,
    )

    const derivedBytes = new Uint8Array(derivedBits)
    const aesKeyRaw = derivedBytes.slice(0, 32)
    const rc4KeyRaw = derivedBytes.slice(32, 64)

    const rsaKeyPair = await crypto.subtle.generateKey(
        { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['encrypt', 'decrypt'],
    )

    const encryptedAesKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKeyPair.publicKey, aesKeyRaw)
    const encryptedRc4Key = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKeyPair.publicKey, rc4KeyRaw)

    return {
        rsa_private_key: JSON.stringify(await crypto.subtle.exportKey('jwk', rsaKeyPair.privateKey)),
        rsa_public_key: JSON.stringify(await crypto.subtle.exportKey('jwk', rsaKeyPair.publicKey)),
        encrypted_aes_key: arrayBufferToBase64(encryptedAesKey),
        encrypted_rc4_key: arrayBufferToBase64(encryptedRc4Key),
    }
}

// ===== Tests =====

async function testTextRoundtrip(config: any): Promise<boolean> {
    const keys = await deriveKeysFromConfig(config)

    const original = 'Halo dunia! 123 @#$'
    const plaintext = new TextEncoder().encode(original).buffer
    const encrypted = await encryptWithKeys(plaintext, keys.aesKey, keys.rc4Key)
    const decrypted = await decryptWithKeys(encrypted, keys.aesKey, keys.rc4Key)
    const decryptedText = new TextDecoder().decode(decrypted)
    const pass = original === decryptedText

    console.log(`  Plaintext:  "${original}"`)
    console.log(`  Encrypted:  ${arrayBufferToHex(encrypted).substring(0, 64)}... (${encrypted.byteLength} bytes)`)
    console.log(`  Decrypted:  "${decryptedText}"`)
    console.log(`  Result:     ${pass ? '[PASS]' : '[FAIL]'}`)
    return pass
}

async function testBinaryRoundtrip(config: any): Promise<boolean> {
    const keys = await deriveKeysFromConfig(config)

    const size = 1 * 1024 * 1024
    const original = crypto.getRandomValues(new Uint8Array(size)).buffer
    const encrypted = await encryptWithKeys(original, keys.aesKey, keys.rc4Key)
    const decrypted = await decryptWithKeys(encrypted, keys.aesKey, keys.rc4Key)
    const pass = arraysEqual(original, decrypted)

    console.log(`  Size:       ${size} bytes`)
    console.log(`  Encrypted:  ${encrypted.byteLength} bytes (overhead: ${encrypted.byteLength - size} bytes)`)
    console.log(`  Result:     ${pass ? '[PASS]' : '[FAIL]'}`)
    return pass
}

async function testIVUniqueness(config: any): Promise<boolean> {
    const keys = await deriveKeysFromConfig(config)

    const plaintext = new TextEncoder().encode('data yang sama').buffer
    const e1 = await encryptWithKeys(plaintext, keys.aesKey, keys.rc4Key)
    const e2 = await encryptWithKeys(plaintext, keys.aesKey, keys.rc4Key)
    const pass = !arraysEqual(e1, e2)

    console.log(`  Ciphertext 1: ${arrayBufferToHex(e1).substring(0, 48)}...`)
    console.log(`  Ciphertext 2: ${arrayBufferToHex(e2).substring(0, 48)}...`)
    console.log(`  Ciphertext berbeda?: ${pass ? 'ya' : 'tidak'}`)
    return pass
}

// ===== Main =====

async function main() {
    console.log('=== Crypto Test Suite ===\n')

    console.log('Generating keys (PBKDF2 + RSA-2048)...')
    const config = await generateKeyFromPassword('test12345678')
    console.log('Keys ready.\n')

    const results: { name: string; pass: boolean }[] = []

    console.log('[Test 1] Text Roundtrip')
    results.push({ name: 'Text Roundtrip', pass: await testTextRoundtrip(config) })

    console.log()
    console.log('[Test 2] Binary 1MB Roundtrip')
    results.push({ name: 'Binary 1MB Roundtrip', pass: await testBinaryRoundtrip(config) })

    console.log()
    console.log('[Test 3] IV Uniqueness')
    results.push({ name: 'IV Uniqueness', pass: await testIVUniqueness(config) })

    console.log()
    console.log('=== Summary ===')
    const passed = results.filter(r => r.pass).length
    const failed = results.filter(r => !r.pass).length
    for (const r of results) {
        console.log(`  ${r.pass ? '[OK]' : '[X]'} ${r.name}`)
    }
    console.log(`\n${results.length} tests: ${passed} passed, ${failed} failed`)

    process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
    console.error('\nFatal error:', err)
    process.exit(1)
})
