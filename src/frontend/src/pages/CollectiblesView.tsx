import NFTGallery from "../components/NFTGallery";

export default function CollectiblesView() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Collectibles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your Law Token and Interpretation Token collectibles. Click any card
            to view details and mint your copy.
          </p>
        </div>
        <NFTGallery />
      </div>
    </div>
  );
}
