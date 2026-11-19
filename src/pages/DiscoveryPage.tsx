import SkipToContent from '@/components/common/SkipToContent';
import BundleDiscoverySection from '@/components/common/BundleDiscoverySection';

const DiscoveryPage: React.FC = () => {
	return (
		<main id="main-content" tabIndex={-1} className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
			<SkipToContent targetId="main-content" />
			<BundleDiscoverySection heading="Creator bundles" />
		</main>
	);
};

export default DiscoveryPage;
