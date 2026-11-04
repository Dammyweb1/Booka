export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`booka-logo ${light ? 'booka-logo-light' : ''}`}>
      <span className="logo-orbit" aria-hidden="true"><span /></span>
      <span>booka</span>
    </div>
  )
}
