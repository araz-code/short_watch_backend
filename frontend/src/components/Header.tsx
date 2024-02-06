import { Link } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header className="pl-10 py-5 text-2xl font-bold text-white font-display bg-[#0d1b4c]">
      <Link to="/">ZIRIUM</Link>
    </header>
  );
};

export default Header;
