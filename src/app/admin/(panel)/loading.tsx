export default function PanelLoading() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando">
      <span className="w-8 h-8 rounded-full border-[3px] border-azul-600/25 border-t-azul-600 animate-spin" />
    </div>
  );
}
