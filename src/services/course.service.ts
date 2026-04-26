// src/services/course.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

export interface Course {
	id: string;
	title: string;
	description: string;
	price: number;
	creatorShareSupply?: number;
	instructorId: string;
	thumbnail?: string;
	category: string;
	level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
	socialHandle?: string;
	isVerified?: boolean;
	volume24h?: number;
	change24h?: number;
}

export interface GetCoursesParams {
	page?: number;
	limit?: number;
	category?: string;
	search?: string;
}

class CourseService extends BaseApiService {
	private readonly PROFILE_CACHE_TTL = 30000; // 30 seconds

	// Get all courses - GET /courses
	async getCourses(params?: GetCoursesParams): Promise<Course[]> {
		const cacheKey = `courses_${JSON.stringify(params || {})}`;
		const cached = cacheManager.get<Course[]>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<Course[]>>(
				'/courses',
				{ params }
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, this.PROFILE_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get single course - GET /courses/:id
	async getCourse(courseId: string): Promise<Course> {
		const cacheKey = `course_${courseId}`;
		const cached = cacheManager.get<Course>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<Course>>(
				`/courses/${courseId}`
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, this.PROFILE_CACHE_TTL);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get enrolled courses - GET /courses/enrolled
	async getEnrolledCourses(): Promise<Course[]> {
		try {
			const response =
				await this.api.get<APIResponse<Course[]>>('/courses/enrolled');

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Enroll in course - POST /courses/:id/enroll
	async enrollInCourse(courseId: string): Promise<void> {
		try {
			await this.api.post(`/courses/${courseId}/enroll`);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Create course - POST /courses
	async createCourse(courseData: Partial<Course>): Promise<Course> {
		try {
			const response = await this.api.post<APIResponse<Course>>(
				'/courses',
				courseData
			);

			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const courseService = new CourseService();
