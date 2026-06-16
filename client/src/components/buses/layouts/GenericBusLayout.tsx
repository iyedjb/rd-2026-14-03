interface GenericBusLayoutProps {
  totalSeats: number;
  reservedSeats: string[];
  selectedSeat: string | null;
  onSeatSelect: (seat: string) => void;
  isSelectable?: boolean | "reserved-only" | "all";
  seatInfo?: { [key: string]: string };
  highlightedSeat?: string | null;
}

export function GenericBusLayout({
  totalSeats,
  reservedSeats,
  selectedSeat,
  onSeatSelect,
  isSelectable = true,
  seatInfo = {},
  highlightedSeat = null
}: GenericBusLayoutProps) {
  
  const Seat = ({ number }: { number: number }) => {
    const seatNum = number.toString();
    const isReserved = reservedSeats.includes(seatNum);
    const isSelected = selectedSeat === seatNum;
    const isHighlighted = highlightedSeat === seatNum;
    const passengerName = seatInfo[seatNum];
    
    const canClick = isSelectable === "reserved-only" 
      ? isReserved 
      : isSelectable === "all"
        ? true
        : isSelectable === true 
          ? !isReserved 
          : false;
    
    const handleClick = () => {
      if (canClick) {
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
          disabled={!canClick}
          data-testid={`seat-${seatNum}`}
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-md border-2 flex items-center justify-center text-xs font-semibold select-none
            ${isHighlighted 
              ? 'bg-yellow-400 dark:bg-yellow-500 border-yellow-600 dark:border-yellow-400 animate-pulse ring-4 ring-yellow-300 dark:ring-yellow-600 z-10'
              : isReserved 
                ? isSelectable === "reserved-only" || isSelectable === "all"
                  ? 'bg-red-200 dark:bg-red-900 border-red-400 dark:border-red-700 cursor-pointer active:bg-red-300 dark:active:bg-red-800'
                  : 'bg-red-200 dark:bg-red-900 border-red-400 dark:border-red-700 cursor-not-allowed opacity-60'
                : isSelected
                  ? 'bg-blue-600 dark:bg-blue-700 border-blue-700 dark:border-blue-800 text-white shadow-lg'
                  : isSelectable === true || isSelectable === "all"
                    ? 'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-700 cursor-pointer active:bg-green-300 dark:active:bg-green-800 shadow-sm'
                    : 'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-700 cursor-not-allowed opacity-60'
            }
          `}
          aria-label={`Assento ${number}${passengerName ? ` - ${passengerName}` : ''}`}
        >
          {number}
        </button>
        {passengerName && (
          <div className={`text-[8px] sm:text-[9px] text-center font-medium max-w-[40px] sm:max-w-[48px] truncate ${isHighlighted ? 'text-yellow-800 dark:text-yellow-200 font-bold' : 'text-red-800 dark:text-red-200'}`} title={passengerName}>
            {passengerName}
          </div>
        )}
      </div>
    );
  };

  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1);
  
  // Create rows of 4 seats (2 left, aisle, 2 right)
  const rows = [];
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4));
  }

  return (
    <div className="space-y-1">
      {/* Header with RODABEM TURISMO branding */}
      <div className="text-center py-4 bg-gradient-to-r from-blue-700 to-blue-900 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white tracking-wide">RODABEM TURISMO</h2>
        <p className="text-blue-100 text-sm mt-1">Mapa de Poltronas</p>
      </div>

      <div className="border-4 border-blue-400 dark:border-blue-500 rounded-lg p-6 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-md">
        <div className="text-center mb-1 pb-3 border-b-2 border-blue-300 dark:border-blue-600">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">Layout do Ônibus</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400">{totalSeats} Poltronas</p>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="flex justify-between items-center gap-8">
              <div className="flex gap-2">
                {row[0] && <Seat number={row[0]} />}
                {row[1] && <Seat number={row[1]} />}
              </div>
              <div className="w-16"></div>
              <div className="flex gap-2">
                {row[3] && <Seat number={row[3]} />}
                {row[2] && <Seat number={row[2]} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
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

