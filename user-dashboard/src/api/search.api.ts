import { apiClient } from './base';

export interface SearchResult {
  id: string;
  title: string;
  content_preview: string;
  type: 'post' | 'event' | 'opportunity' | 'confession' | 'marketplace';
  category: string;
  author: string;
  date: string;
  url: string;
  score: number;
}

export interface SearchResults {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  type?: 'post' | 'event' | 'opportunity' | 'confession' | 'marketplace' | 'all';
  category?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'relevance' | 'date' | 'popularity';
  sort_order?: 'asc' | 'desc';
}

class SearchApi {
  async search(options: SearchOptions): Promise<SearchResults> {
    try {
      const { query, ...filters } = options;
      const queryParams = {
        q: query,
        ...filters
      };

      // Using the same pattern as other working APIs
      const response = await apiClient.get('/search', queryParams);

      if (response.success && response.data) {
        // Create the result with proper structure
        const searchResults: SearchResults = {
          results: response.data || [],
          total: response.pagination?.total || 0,
          page: response.pagination?.page || 1,
          limit: response.pagination?.limit || 10,
          totalPages: response.pagination?.pages || 1
        };
        return searchResults;
      }

      return {
        results: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1
      };
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const response = await apiClient.get('/search/suggestions', { q: query });

      if (response.success && response.data) {
        return response.data || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      return [];
    }
  }

  async getSearchFilters(): Promise<{
    categories: Array<{ name: string; count: number }>;
    types: Array<{ type: string; count: number }>;
    date_ranges: Array<{ label: string; value: string }>;
  }> {
    try {
      const response = await apiClient.get('/search/filters');

      if (response.success && response.data) {
        // Return the exact data structure
        return {
          categories: response.data.categories || [],
          types: response.data.types || [],
          date_ranges: response.data.date_ranges || []
        };
      }

      return {
        categories: [],
        types: [],
        date_ranges: []
      };
    } catch (error) {
      console.error('Error fetching search filters:', error);
      return {
        categories: [],
        types: [],
        date_ranges: []
      };
    }
  }
}

export const searchApi = new SearchApi();