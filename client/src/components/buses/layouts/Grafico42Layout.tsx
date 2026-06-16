interface Grafico42LayoutProps {
  reservedSeats: string[];
  selectedSeat: string | null;
  onSeatSelect: (seat: string) => void;
  isSelectable?: boolean | "reserved-only" | "all";
  seatInfo?: { [key: string]: string };
  highlightedSeat?: string | null;
}

export function Grafico42Layout({
  reservedSeats,
  selectedSeat,
  onSeatSelect,
  isSelectable = true,
  seatInfo = {},
  highlightedSeat = null
}: Grafico42LayoutProps) {
  
  const Seat = ({ number }: { number: number }) => {
    const seatNum = number.toString();
    const isReserved = reservedSeats.includes(seatNum);
    const isSelected = selectedSeat === seatNum;
    const isHighlighted = highlightedSeat === seatNum;
    const passengerName = seatInfo[seatNum];
    const isGuide = seatNum === "41" || seatNum === "42";
    
    const canClick = isSelectable === "reserved-only" 
      ? isReserved 
      : isSelectable === "all"
        ? true
        : isSelectable === true 
          ? (!isReserved && !isGuide)
          : false;
    
    const handleClick = () => {
      if (canClick && !isGuide) {
        try {
          onSeatSelect(seatNum);
        } catch (error) {
          console.error('Error selecting seat:', error);
        }
      }
    };

    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={!canClick || isGuide}
          data-testid={`seat-${seatNum}`}
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          className={`
            w-12 h-12 rounded-md border-2 transition-all flex items-center justify-center text-xs font-semibold select-none
            ${isGuide
              ? 'bg-gray-400 dark:bg-gray-600 border-gray-500 dark:border-gray-500 text-white cursor-not-allowed opacity-80'
              : isHighlighted 
                ? 'bg-yellow-400 dark:bg-yellow-500 border-yellow-600 dark:border-yellow-400 animate-pulse ring-4 ring-yellow-300 dark:ring-yellow-600 scale-125 z-10'
                : isReserved 
                  ? isSelectable === "reserved-only" || isSelectable === "all"
                    ? 'bg-red-200 dark:bg-red-900 border-red-400 dark:border-red-700 cursor-pointer active:scale-105 active:bg-red-300 dark:active:bg-red-800'
                    : 'bg-red-200 dark:bg-red-900 border-red-400 dark:border-red-700 cursor-not-allowed opacity-60'
                  : isSelected
                    ? 'bg-blue-500 border-blue-600 text-white scale-110'
                    : isSelectable === true || isSelectable === "all"
                      ? 'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-700 cursor-pointer active:scale-105 active:bg-green-200 dark:active:bg-green-800'
                      : 'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-700 cursor-not-allowed opacity-60'
            }
          `}
          aria-label={isGuide ? 'Guia' : `Assento ${number}${passengerName ? ` - ${passengerName}` : ''}`}
        >
          {isGuide ? 'GUIA' : number}
        </button>
        {passengerName && (
          <div className={`text-[9px] text-center font-medium max-w-[48px] truncate ${isHighlighted ? 'text-yellow-800 dark:text-yellow-200 font-bold' : 'text-red-800 dark:text-red-200'}`} title={passengerName}>
            {passengerName}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="text-center py-4 bg-gradient-to-r from-blue-700 to-blue-900 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white tracking-wide">RODABEM TURISMO</h2>
        <p className="text-blue-100 text-sm mt-1">Mapa de Poltronas - Gráfico 42</p>
      </div>

      <div className="border-4 border-blue-400 dark:border-blue-500 rounded-lg p-6 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-md">
        <div className="text-center mb-1 pb-3 border-b-2 border-blue-300 dark:border-blue-600">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">GRÁFICO 42 POLTRONAS</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400">Ônibus Gráfico</p>
        </div>

        <div className="space-y-3">
          {[
            [1, 2, 4, 3],
            [5, 6, 8, 7],
            [9, 10, 12, 11],
            [13, 14, 16, 15],
            [17, 18, 20, 19],
            [21, 22, 24, 23],
            [25, 26, 28, 27],
            [29, 30, 32, 31],
            [33, 34, 36, 35],
            [37, 38, 40, 39]
          ].map((row, idx) => (
            <div key={idx} className="flex justify-between items-center gap-8">
              <div className="flex gap-2">
                <Seat number={row[0]} />
                <Seat number={row[1]} />
              </div>
              <div className="w-16"></div>
              <div className="flex gap-2">
                <Seat number={row[2]} />
                <Seat number={row[3]} />
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={41} />
              <Seat number={42} />
            </div>
            <div className="w-16"></div>
            <div className="flex justify-end flex-1">
              <div className="bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                🚻 BANHEIRO
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-3">
            <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700 rounded px-4 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
              ❄️ GELADEIRA
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900 border-2 border-green-400 dark:border-green-700"></div>
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-900 border-2 border-red-400 dark:border-red-700"></div>
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-600"></div>
          <span>Selecionado</span>
        </div>
      </div>
    </div>
  );
}
