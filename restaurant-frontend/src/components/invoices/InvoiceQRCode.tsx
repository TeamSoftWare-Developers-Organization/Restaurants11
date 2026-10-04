'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface InvoiceQRCodeProps {
    value: string;
    size?: number;
    className?: string;
}

export default function InvoiceQRCode({ value, size = 110, className = '' }: InvoiceQRCodeProps) {
    const [dataUrl, setDataUrl] = useState<string>('');

    useEffect(() => {
        if (!value) return;
        QRCode.toDataURL(value, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: size,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        })
            .then(url => setDataUrl(url))
            .catch(err => console.error('Failed to generate invoice QR code', err));
    }, [value, size]);

    if (!dataUrl) {
        return <div style={{ width: size, height: size }} className="bg-gray-100 animate-pulse rounded-md" />;
    }

    return (
        <img
            src={dataUrl}
            alt="Invoice QR Code"
            width={size}
            height={size}
            className={`object-contain inline-block ${className}`}
        />
    );
}
