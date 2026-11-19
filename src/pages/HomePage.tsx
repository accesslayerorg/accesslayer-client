import FAQ from '../components/home/FAQ';
import Footer from '../components/home/Footer';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import CreatorSpotlight from '../components/home/CreatorSpotlight';
import TrendingCreators from '../components/home/TrendingCreators';
import BundleDiscoverySection from '../components/common/BundleDiscoverySection';
import { useNavigationTiming } from '../hooks/useNavigationTiming';

export default function HomePage() {
	useNavigationTiming('marketplace');

	return (
		<>
			<Header />
			<main>
				<Hero />
				<CreatorSpotlight />
				<TrendingCreators />
				<div className="mx-auto max-w-6xl px-4 py-8">
					<BundleDiscoverySection heading="Creator bundles" />
				</div>
				<FAQ />
			</main>
			<Footer />
		</>
	);
}
