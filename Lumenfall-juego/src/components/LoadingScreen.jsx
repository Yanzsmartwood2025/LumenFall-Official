/**
 * LoadingScreen
 * -------------
 * Sustituye a cualquier pantalla de carga estática en index.html.
 * El porcentaje viene de `lumenfall:assets-progress`, no de un temporizador
 * inventado, para que refleje la carga real de texturas/audio/sprites.
 */
export default function LoadingScreen({ loaded, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-void">
      <div className="relative h-40 w-px overflow-hidden">
        <div
          className="lf-light-beam absolute inset-0 bg-gradient-to-b from-ember via-ember/40 to-transparent"
          style={{ height: '100%' }}
        />
      </div>

      <p className="mt-8 font-ui text-sm tracking-wide text-mist">
        La luz desciende sobre Lumenfall
      </p>

      <div className="mt-4 h-[2px] w-56 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full bg-ember transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 font-ui text-xs text-mist/60">{pct}%</p>
    </div>
  );
}
