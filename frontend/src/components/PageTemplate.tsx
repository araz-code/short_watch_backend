import Navigation from "./Navigation";

const PageTemplate: React.FC<React.PropsWithChildren> = (props) => {
  return (
    <div className="flex flex-col text-gray-800">
      <Navigation />
      <div className="flex flex-col items-center justify-center">
        {props.children}
      </div>
    </div>
  );
};

export default PageTemplate;
