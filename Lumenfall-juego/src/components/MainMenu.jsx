import { emitToGame, LumenfallEvents } from '../lumenfallBridge';

/**
 * MainMenu
 * --------
 * Pantalla de título. No decide aquí si el jugador puede entrar como
 * invitado o necesita Firebase: eso lo sigue resolviendo game.js (regla
 * ya documentada en LUMENFALL.md: local/`?guest=1` sin login, producción
 * exige Firebase). El menú solo comunica la intención del jugador.
 */
export default function MainMenu({ onStart }) {
  const handleEnter = () => {
    emitToGame(LumenfallEvents.START_GAME, { guest: false });
    onStart?.();
  };

  const handleGuest = () => {
    emitToGame(LumenfallEvents.START_GAME, { guest: true });
    onStart?.();
  };

  return (
    <div className="absolute inset-0 flex bg-void">
      {/* El rayo de luz es el eje visual: título y botones se alinean a él,
          no se centran en una tarjeta genérica. */}
      <div className="lf-light-beam absolute left-[18%] top-0 h-full w-px bg-gradient-to-b from-ember via-ember/30 to-transparent" />

      <div className="relative z-10 flex w-full max-w-xl flex-col justify-center pl-[calc(18%+2.5rem)]">
        <h1 className="font-display text-6xl font-light tracking-tight text-white">
          Lumenfall
        </h1>
        <p className="mt-3 max-w-sm font-ui text-sm leading-relaxed text-mist">
          Algo cayó del cielo y todavía arde bajo tierra. Baja a buscarlo.
        </p>

        <div className="mt-10 flex flex-col items-start gap-3">
          <button
            onClick={handleEnter}
            className="font-ui text-base font-medium text-white transition-colors hover:text-ember"
          >
            Entrar
          </button>
          <button
            onClick={handleGuest}
            className="font-ui text-sm text-mist/70 transition-colors hover:text-mist"
          >
            Entrar como invitado
          </button>
        </div>
      </div>
    </div>
  );
}
