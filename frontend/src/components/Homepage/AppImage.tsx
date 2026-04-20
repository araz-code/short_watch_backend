import appImage from "../../static/app.webp";

const AppImage: React.FC = () => {
  return (
    <div className="relative inline-block self-center">
      <img
        className="max-h-[500px] w-auto self-center drop-shadow-2xl"
        src={appImage}
        alt="Danish Short Watch application showing stock data and charts"
        loading="lazy"
        width="400"
        height="456"
      />
      <div className="absolute bottom-[-25px] left-1/2 transform -translate-x-1/2 w-[80%] h-4 bg-black/35 rounded-[100%] blur-xl"></div>
    </div>
  );
};

export default AppImage;
