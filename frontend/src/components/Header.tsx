import { Link } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header className="pl-10 py-5 text-4xl font-bold text-white font-display bg-[#0d1b4c] mb-[60px]">
      <Link to="/">ZIRIUM</Link>
    </header>
  );
};

export default Header;
