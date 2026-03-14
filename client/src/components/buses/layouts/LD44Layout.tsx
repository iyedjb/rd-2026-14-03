import { MoveVertical, Droplet, Wind } from "lucide-react";

interface LD44LayoutProps {
  reservedSeats: string[];
  selectedSeat: string | null;
  onSeatSelect: (seat: string) => void;
  isSelectable?: boolean | "reserved-only" | "all";
  seatInfo?: { [key: string]: string };
  highlightedSeat?: string | null;
}

export function LD44Layout({
  reservedSeats,
  selectedSeat,
  onSeatSelect,
  isSelectable = true,
  seatInfo = {},
  highlightedSeat = null
}: LD44LayoutProps) {
  
  const Seat = ({ number }: { number: number }) => {
    const seatNum = number.toString();
    const isReserved = reservedSeats.includes(seatNum);
    const isSelected = selectedSeat === seatNum;
    const isHighlighted = highlightedSeat === seatNum;
    const passengerName = seatInfo[seatNum];
    const isGuide = seatNum === "43" || seatNum === "44";
    
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
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={!canClick || isGuide}
          data-testid={`seat-${seatNum}`}
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          className={`
            w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold shadow-md select-none
            ${isGuide
              ? 'bg-gray-400 dark:bg-gray-600 border-gray-500 dark:border-gray-500 text-white cursor-not-allowed opacity-80'
              : isHighlighted 
                ? 'bg-yellow-400 dark:bg-yellow-500 border-yellow-600 dark:border-yellow-400 animate-pulse ring-4 ring-yellow-300 dark:ring-yellow-600 z-10'
                : isReserved 
                  ? isSelectable === "reserved-only" || isSelectable === "all"
                    ? 'bg-red-500 dark:bg-red-700 border-red-600 dark:border-red-800 text-white cursor-pointer active:bg-red-600 dark:active:bg-red-600 shadow-lg'
                    : 'bg-red-500 dark:bg-red-700 border-red-600 dark:border-red-800 text-white cursor-not-allowed opacity-60'
                  : isSelected
                    ? 'bg-blue-600 dark:bg-blue-700 border-blue-700 dark:border-blue-800 text-white shadow-lg'
                    : isSelectable === true || isSelectable === "all"
                      ? 'bg-green-400 dark:bg-green-600 border-green-500 dark:border-green-700 text-green-900 dark:text-green-100 cursor-pointer active:bg-green-500 dark:active:bg-green-500 shadow-md'
                      : 'bg-green-400 dark:bg-green-600 border-green-500 dark:border-green-700 text-green-900 dark:text-green-100 cursor-not-allowed opacity-60'
            }
          `}
          aria-label={isGuide ? 'Guia' : `Assento ${number}${passengerName ? ` - ${passengerName}` : ''}`}
        >
          {isGuide ? 'GUIA' : number}
        </button>
        {passengerName && (
          <div className={`text-[7px] sm:text-[8px] text-center font-semibold max-w-[36px] sm:max-w-[40px] truncate leading-tight ${isHighlighted ? 'text-yellow-800 dark:text-yellow-200 font-bold' : 'text-gray-700 dark:text-gray-400'}`} title={passengerName}>
            {passengerName.split(' ')[0]}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-center py-3 bg-gradient-to-r from-blue-800 to-blue-950 rounded-xl shadow-xl">
        <h2 className="text-xl font-bold text-white tracking-widest">RODABEM TURISMO</h2>
        <p className="text-blue-200 text-xs mt-0.5 font-semibold">Mapa de Poltronas - Leito 44</p>
      </div>

      <div className="border-3 border-blue-500 dark:border-blue-600 rounded-2xl p-6 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-xl">
        <div className="text-center mb-4 pb-3 border-b-3 border-blue-400 dark:border-blue-600">
          <h3 className="text-base font-bold text-blue-950 dark:text-blue-100">LEITO 44 POLTRONAS</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">Ônibus Leito de Longo Curso</p>
        </div>

        <div className="space-y-2.5">
          {/* Front row */}
          <div className="flex justify-between items-start gap-6 mb-1">
            <div className="flex gap-1.5">
              <Seat number={1} />
              <Seat number={2} />
            </div>
            <div></div>
            <div className="flex gap-1.5">
              <Seat number={4} />
              <Seat number={3} />
            </div>
          </div>

          {/* ESCADA behind seats 4,3 */}
          <div className="flex justify-end mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-md">
              <MoveVertical className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">ESCADA</span>
            </div>
          </div>

          {/* Regular seat rows */}
          {Array.from({ length: 9 }, (_, rowIdx) => (
            <div key={rowIdx} className="flex justify-between items-start gap-6">
              <div className="flex gap-1.5">
                <Seat number={5 + rowIdx * 4} />
                <Seat number={6 + rowIdx * 4} />
              </div>
              <div></div>
              <div className="flex gap-1.5">
                <Seat number={8 + rowIdx * 4} />
                <Seat number={7 + rowIdx * 4} />
              </div>
            </div>
          ))}

          {/* FRIGOBAR in middle of bus */}
          <div className="flex justify-center my-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 dark:bg-yellow-600 rounded-lg border-2 border-yellow-500 dark:border-yellow-700 shadow-lg">
              <Wind className="h-4 w-4 text-yellow-900 dark:text-yellow-100 font-bold" />
              <span className="text-xs font-bold text-yellow-900 dark:text-yellow-100 whitespace-nowrap">FRIGOBAR</span>
            </div>
          </div>

          {/* Last row - seats 41, 42, 43, 44 */}
          <div className="flex justify-between items-start gap-6 mb-1 mt-2">
            <div className="flex gap-1.5">
              <Seat number={41} />
              <Seat number={42} />
            </div>
            <div></div>
            <div className="flex gap-1.5">
              <Seat number={44} />
              <Seat number={43} />
            </div>
          </div>

          {/* BANHEIRO behind seats 44,43 */}
          <div className="flex justify-end">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-400 dark:bg-blue-700 rounded-lg border-2 border-blue-500 dark:border-blue-800 shadow-md">
              <Droplet className="h-3.5 w-3.5 text-blue-900 dark:text-blue-100" />
              <span className="text-xs font-bold text-blue-900 dark:text-blue-100 whitespace-nowrap">BANHEIRO</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 text-xs bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-600 border border-green-500 dark:border-green-700"></div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500 dark:bg-red-700 border border-red-600 dark:border-red-800"></div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-600 dark:bg-blue-700 border border-blue-700 dark:border-blue-800"></div>
          <span className="font-semibold text-gray-700 dark:text-gray-300">Selecionado</span>
        </div>
      </div>
    </div>
  );
}

