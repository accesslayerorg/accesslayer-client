import FAQ from '../components/home/FAQ';
import Footer from '../components/home/Footer';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import CreatorSpotlight from '../components/home/CreatorSpotlight';
import TrendingCreators from '../components/home/TrendingCreators';
import TrendingLeaderboard from '../components/home/TrendingLeaderboard';
import { useNavigationTiming } from '../hooks/useNavigationTiming';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLocation } from 'react-router';

export default function HomePage() {
	const location = useLocation();
	useNavigationTiming('marketplace');
	useDocumentTitle(
		location.pathname === '/creators'
			? 'Marketplace — AccessLayer'
			: 'AccessLayer — Creator Key Marketplace'
	);

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
