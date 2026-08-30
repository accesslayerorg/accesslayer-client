import FAQ from '../components/home/FAQ';
import Footer from '../components/home/Footer';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import CreatorSpotlight from '../components/home/CreatorSpotlight';
import TrendingCreators from '../components/home/TrendingCreators';
import TrendingLeaderboard from '../components/home/TrendingLeaderboard';
import { useNavigationTiming } from '../hooks/useNavigationTiming';

export default function HomePage() {
	useNavigationTiming('marketplace');

	return (
		<>
			<Header />
			<main>
				<Hero />
				<CreatorSpotlight />
				<TrendingLeaderboard />
				<TrendingCreators />
				<FAQ />
			</main>
			<Footer />
		</>
	);
}
