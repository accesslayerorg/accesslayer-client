import FAQ from '../components/home/FAQ';
import Footer from '../components/home/Footer';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import TrendingCreators from '../components/home/TrendingCreators';

export default function HomePage() {
	return (
		<>
			<Header />
			<main>
				<Hero />
				<TrendingCreators />
				<FAQ />
			</main>
			<Footer />
		</>
	);
}
