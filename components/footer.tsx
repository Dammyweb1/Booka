import Logo from './logo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Logo />
        <span className="site-footer-copyright">© {year} Booka. All rights reserved.</span>
      </div>
    </footer>
  )
}
