/**
 * ZATCA E-Invoicing TLV (Tag-Length-Value) Base64 Encoder
 * Compliant with standard Tax Authority E-Invoicing QR Code Specifications
 */

export function getTLVForValue(tagNum: number, tagValue: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(tagValue || '');
    const tag = tagNum;
    const length = valueBytes.length;
    const tlv = new Uint8Array(2 + length);
    tlv[0] = tag;
    tlv[1] = length;
    tlv.set(valueBytes, 2);
    return tlv;
}

export function generateZatcaBase64TLV(
    sellerName: string,
    vatNumber: string,
    timestamp: string,
    totalWithVat: number | string,
    vatAmount: number | string
): string {
    const tlv1 = getTLVForValue(1, sellerName || 'مطعمنا');
    const tlv2 = getTLVForValue(2, vatNumber || '300000000000003');
    const tlv3 = getTLVForValue(3, timestamp || new Date().toISOString());
    const tlv4 = getTLVForValue(
        4,
        typeof totalWithVat === 'number' ? totalWithVat.toFixed(2) : String(totalWithVat || '0.00')
    );
    const tlv5 = getTLVForValue(
        5,
        typeof vatAmount === 'number' ? vatAmount.toFixed(2) : String(vatAmount || '0.00')
    );

    const totalLength = tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length;
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const tlv of [tlv1, tlv2, tlv3, tlv4, tlv5]) {
        combined.set(tlv, offset);
        offset += tlv.length;
    }

    let binary = '';
    const bytes = new Uint8Array(combined);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
