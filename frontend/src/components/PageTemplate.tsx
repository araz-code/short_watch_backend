import Navigation from "./Navigation";

const PageTemplate: React.FC<React.PropsWithChildren> = (props) => {
  return (
    <div className="flex flex-col text-gray-800 flex-1 min-h-0">
      <Navigation />
      <main id="main-content" className="flex flex-col items-center justify-center w-full flex-1 min-h-0">
        {props.children}
      </main>
    </div>
  );
};

export default PageTemplate;
