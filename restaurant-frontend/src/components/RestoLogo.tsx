'use client';

import React from 'react';

interface RestoLogoProps {
    className?: string;
    alt?: string;
}

export function RestoLogo({
    className = 'w-full h-full object-contain',
    alt = 'RestoSystem Logo'
}: RestoLogoProps) {
    return (
        <>
            {/* الشعار للوضع الفاتح: لون غامق كحلي واضح مع الاحتفاظ بـ Tech باللون البرتقالي */}
            <img
                src="/branding/restosystem-logo-light.png"
                alt={alt}
                className={`dark:hidden ${className}`}
                loading="eager"
            />
            {/* الشعار للوضع الليلي: لون أبيض ناصع مع الاحتفاظ بـ Tech باللون البرتقالي */}
            <img
                src="/branding/restosystem-logo-dark.png"
                alt={alt}
                className={`hidden dark:block ${className}`}
                loading="eager"
            />
        </>
    );
}

export default RestoLogo;
