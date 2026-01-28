'use client';

const CURRENT_SEASON = '2024-25';

interface RetiredJerseyProps {
  playerName: string;
  jerseyNumber: string | null;
  seasonStart: string;
  seasonEnd: string | null;
  teamColors: string[];
}

export function RetiredJersey({
  playerName,
  jerseyNumber,
  seasonStart,
  seasonEnd,
  teamColors,
}: RetiredJerseyProps) {
  // If seasonEnd is the current season, treat as still active
  const isActive = !seasonEnd || seasonEnd === CURRENT_SEASON;
  const displaySeasonEnd = isActive ? '' : seasonEnd?.split('-')[0];

  // Use team colors or fallback to defaults
  const primaryColor = teamColors?.[0] || '#1e3a5f';
  const secondaryColor = teamColors?.[1] || '#ffffff';
  const accentColor = teamColors?.[2] || '#c4a962';

  // Determine if a color is dark (for text contrast)
  const isDark = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  // Calculate color contrast ratio
  const getContrastColor = (bgColor: string, color1: string, color2: string) => {
    const getBrightness = (color: string) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    };

    const bgBrightness = getBrightness(bgColor);
    const c1Brightness = getBrightness(color1);
    const c2Brightness = getBrightness(color2);

    const contrast1 = Math.abs(bgBrightness - c1Brightness);
    const contrast2 = Math.abs(bgBrightness - c2Brightness);

    // If neither color has good contrast, return white or black
    if (contrast1 < 60 && contrast2 < 60) {
      return isDark(bgColor) ? '#ffffff' : '#000000';
    }

    return contrast1 > contrast2 ? color1 : color2;
  };

  const textColor = isDark(primaryColor) ? secondaryColor : '#1a1a1a';
  const numberColor = getContrastColor(primaryColor, secondaryColor, accentColor);

  // Get last name for jersey back
  const lastName = playerName.split(' ').slice(-1)[0].toUpperCase();

  return (
    <div className="group relative flex flex-col items-center">
      {/* Hanging rope/chain */}
      <div className="w-0.5 h-8 bg-gradient-to-b from-gray-600 to-gray-400" />

      {/* Jersey banner - increased size */}
      <div
        className="relative w-28 h-40 rounded-sm shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor} 60%, ${secondaryColor}22 100%)`,
          boxShadow: `0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 ${secondaryColor}33`,
        }}
      >
        {/* Jersey collar */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 rounded-b-full"
          style={{ backgroundColor: secondaryColor }}
        />

        {/* Player name - bigger font */}
        <div
          className="absolute top-5 left-0 right-0 text-center text-[11px] font-bold tracking-wide px-1 truncate"
          style={{ color: textColor }}
        >
          {lastName}
        </div>

        {/* Jersey number - with outline for better contrast */}
        <div
          className="absolute top-10 left-0 right-0 text-center text-4xl font-black"
          style={{
            color: numberColor,
            textShadow: `
              -1px -1px 0 ${isDark(numberColor) ? '#ffffff55' : '#00000055'},
              1px -1px 0 ${isDark(numberColor) ? '#ffffff55' : '#00000055'},
              -1px 1px 0 ${isDark(numberColor) ? '#ffffff55' : '#00000055'},
              1px 1px 0 ${isDark(numberColor) ? '#ffffff55' : '#00000055'}
            `,
          }}
        >
          {jerseyNumber || '?'}
        </div>

        {/* Season range badge - bigger */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[7px] font-semibold whitespace-nowrap"
          style={{
            backgroundColor: accentColor,
            color: isDark(accentColor) ? '#fff' : '#000',
          }}
        >
          {seasonStart.split('-')[0]}-{displaySeasonEnd}
        </div>

        {/* Subtle jersey stripes */}
        <div
          className="absolute bottom-10 left-0 right-0 h-1.5 opacity-30"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>

    </div>
  );
}
