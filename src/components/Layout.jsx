import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
