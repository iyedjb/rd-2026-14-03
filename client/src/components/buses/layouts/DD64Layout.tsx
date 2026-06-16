import { Armchair, Tv, DoorOpen } from "lucide-react";

interface DD64LayoutProps {
  reservedSeats: string[];
  selectedSeat: string | null;
  onSeatSelect: (seat: string) => void;
  isSelectable?: boolean | "reserved-only" | "all";
  seatInfo?: { [key: string]: string };
  highlightedSeat?: string | null;
}

export function DD64Layout({
  reservedSeats,
  selectedSeat,
  onSeatSelect,
  isSelectable = true,
  seatInfo = {},
  highlightedSeat = null
}: DD64LayoutProps) {
  
  const Seat = ({ number }: { number: number }) => {
    const seatNum = number.toString();
    const isReserved = reservedSeats.includes(seatNum);
    const isSelected = selectedSeat === seatNum;
    const isHighlighted = highlightedSeat === seatNum;
    const passengerName = seatInfo[seatNum];
    const isGuide = seatNum === "45" || seatNum === "46";
    
    const canClick = isSelectable === "reserved-only" 
      ? isReserved 
      : isSelectable === "all"
        ? true
        : isSelectable === true 
          ? (!isReserved && !isGuide)
          : false;
    
    // Safe click handler for all devices
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
            w-10 h-10 sm:w-12 sm:h-12 rounded-md border-2 flex items-center justify-center text-xs font-semibold select-none
            ${isGuide
              ? 'bg-gray-400 dark:bg-gray-600 border-gray-500 dark:border-gray-500 text-white cursor-not-allowed opacity-80'
              : isHighlighted 
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
          aria-label={isGuide ? 'Guia' : `Assento ${number}${passengerName ? ` - ${passengerName}` : ''}`}
        >
          {isGuide ? 'GUIA' : number}
        </button>
        {passengerName && (
          <div className={`text-[8px] sm:text-[9px] text-center font-medium max-w-[40px] sm:max-w-[48px] truncate ${isHighlighted ? 'text-yellow-800 dark:text-yellow-200 font-bold' : 'text-red-800 dark:text-red-200'}`} title={passengerName}>
            {passengerName}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Header with RODABEM TURISMO branding */}
      <div className="text-center py-4 bg-gradient-to-r from-blue-700 to-blue-900 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white tracking-wide">RODABEM TURISMO</h2>
        <p className="text-blue-100 text-sm mt-1">Mapa de Poltronas - DD 64 G7</p>
      </div>

      {/* Upper Floor - PISO SUPERIOR */}
      <div className="border-4 border-blue-400 dark:border-blue-500 rounded-lg p-6 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-md">
        <div className="text-center mb-4 pb-3 border-b-2 border-blue-300 dark:border-blue-600">
          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200">PISO SUPERIOR</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400">Andar de Cima</p>
        </div>

        <div className="space-y-3">
          {/* TV indicator */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </div>
          </div>

          {/* Rows 1-8 (seats 1-16) */}
          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={1} />
              <Seat number={2} />
            </div>
            <div className="w-16"></div>
            <div className="flex gap-2">
              <Seat number={4} />
              <Seat number={3} />
            </div>
          </div>

          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={5} />
              <Seat number={6} />
            </div>
            <div className="w-16"></div>
            <div className="flex gap-2">
              <Seat number={8} />
              <Seat number={7} />
            </div>
          </div>

          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={9} />
              <Seat number={10} />
            </div>
            <div className="w-16"></div>
            <div className="flex gap-2">
              <Seat number={12} />
              <Seat number={11} />
            </div>
          </div>

          {/* Stairs indicator */}
          <div className="py-2 text-center border-y-2 border-dashed border-gray-400 dark:border-gray-600">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">⬇️ ESCADA ⬇️</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-500">Acesso ao Piso Inferior</p>
          </div>

          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={13} />
              <Seat number={14} />
            </div>
          </div>

          {/* Frigobar */}
          <div className="flex justify-center py-2">
            <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700 rounded px-4 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
              ❄️ FRIGOBAR
            </div>
          </div>

          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={15} />
              <Seat number={16} />
            </div>
          </div>

          {/* TV indicator */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </div>
          </div>

          <div className="flex justify-between items-center gap-8">
            <div className="flex gap-2">
              <Seat number={17} />
              <Seat number={18} />
            </div>
            <div className="w-16"></div>
            <div className="flex gap-2">
              <Seat number={20} />
              <Seat number={19} />
            </div>
          </div>

          {/* Rows continuing */}
          {[[21,22,24,23], [25,26,28,27], [29,30,32,31], [33,34,36,35]].map((row, idx) => (
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

          {/* TV indicator */}
          <div className="flex justify-center my-2">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </div>
          </div>

          {[[37,38,40,39], [41,42,44,43], [45,46,48,47]].map((row, idx) => (
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

          {/* Frigobar */}
          <div className="flex justify-center py-2">
            <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700 rounded px-4 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
              ❄️ FRIGOBAR
            </div>
          </div>
        </div>
      </div>

      {/* Lower Floor - PISO INFERIOR */}
      <div className="border-4 border-purple-400 dark:border-purple-500 rounded-lg p-6 bg-gradient-to-b from-purple-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-md">
        <div className="text-center mb-4 pb-3 border-b-2 border-purple-300 dark:border-purple-600">
          <h3 className="text-lg font-bold text-purple-900 dark:text-purple-200">PISO INFERIOR</h3>
          <p className="text-xs text-purple-700 dark:text-purple-400">Andar de Baixo</p>
        </div>

        <div className="space-y-3">
          {/* VIP Room and Bathroom */}
          <div className="flex justify-between items-center mb-4">
            <div className="bg-purple-100 dark:bg-purple-900 border-2 border-purple-300 dark:border-purple-700 rounded px-4 py-2 text-xs font-semibold text-purple-800 dark:text-purple-200">
              ⭐ SALA VIP
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
              🚻 BANHEIRO
            </div>
          </div>

          {/* TV and Door */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <DoorOpen className="h-4 w-4" />
              <span>PORTA</span>
            </div>
          </div>

          {/* Stairs and Entry */}
          <div className="py-2 text-center border-y-2 border-dashed border-gray-400 dark:border-gray-600 mb-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">⬆️ ESCADA ⬆️</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-500">Acesso ao Piso Superior</p>
          </div>

          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-semibold">
              <DoorOpen className="h-4 w-4" />
              <span>ENTRADA</span>
            </div>
          </div>

          {/* Door indicator */}
          <div className="flex justify-start mb-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <DoorOpen className="h-4 w-4" />
              <span>PORTA</span>
            </div>
          </div>

          {/* TV indicator */}
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </div>
          </div>

          {/* Lower floor seats */}
          {[[49,50,52,51], [53,54,56,55], [57,58,60,59], [61,62,64,63]].map((row, idx) => (
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

          {/* Frigobar and Baggage */}
          <div className="flex justify-center gap-4 pt-3">
            <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700 rounded px-4 py-1 text-xs font-semibold text-blue-800 dark:text-blue-200">
              ❄️ FRIGOBAR
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 dark:border-yellow-700 rounded px-4 py-1 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
              🧳 BAGAGEIRO
            </div>
          </div>

          {/* Driver's bed */}
          <div className="flex justify-end mt-3">
            <div className="bg-orange-100 dark:bg-orange-900 border-2 border-orange-300 dark:border-orange-700 rounded px-4 py-1 text-xs font-semibold text-orange-800 dark:text-orange-200">
              🛏️ CAMA MOTORISTA
            </div>
          </div>
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

