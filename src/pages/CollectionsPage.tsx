/**
 * Collections listing page - all published collections (#1481)
 * Route: /collections
 */

import { Helmet } from 'react-helmet-async';
import { useCollections } from '@/hooks/useCollections';

export function CollectionsPage() {
  const { data: collections = [], isLoading, error } = useCollections();

  return (
    <>
      <Helmet>
        <title>Collections - Access Layer</title>
        <meta
          name="description"
          content="Browse curated collections of creator keys"
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Collections</h1>
            <p className="text-lg text-slate-400">
              Explore curated collections handpicked by editors
            </p>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-400">Loading collections...</div>
          ) : error ? (
            <div className="text-center text-red-400">Error loading collections</div>
          ) : collections.length === 0 ? (
            <div className="text-center text-slate-400">
              No collections available yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map(collection => (
                <a
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group cursor-pointer"
                >
                  <div className="rounded-lg overflow-hidden bg-slate-700 hover:bg-slate-600 transition-colors">
                    {collection.coverImage && (
                      <div className="aspect-video overflow-hidden bg-slate-600">
                        <img
                          src={collection.coverImage}
                          alt={collection.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                        {collection.title}
                      </h3>
                      {collection.description && (
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {collection.keyCount} key{collection.keyCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CollectionsPage;
