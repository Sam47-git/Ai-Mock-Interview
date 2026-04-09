interface MarqueImgProps {
  img: string;
}

export const MarqueImg = ({ img }: MarqueImgProps) => {
  return (
    <div className="flex items-center justify-center mx-8">
      <img
        src={img}
        alt=""
        className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300"
      />
    </div>
  );
};