/**
 * Collection detail page - shows keys with annotations (#1481)
 * Route: /collections/:slug
 */

import { useParams } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { useCollectionDetail, useFollowCollectionMutation } from '@/hooks/useCollections';

export function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: collection, isLoading, error } = useCollectionDetail(slug || '');
  const followMutation = useFollowCollectionMutation();

  if (!slug) {
    return (
      <div className="text-center text-red-400 py-12">
        Collection not found
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center text-slate-400 py-12">
        Loading collection...
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="text-center text-red-400 py-12">
        Error loading collection
      </div>
    );
  }

  const isEditor = false;

  return (
    <>
      <Helmet>
        <title>{collection.title} - Access Layer</title>
        <meta name="description" content={collection.description || ''} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4 py-12">
          {collection.coverImage && (
            <div className="mb-8 rounded-lg overflow-hidden h-96 bg-slate-700">
              <img
                src={collection.coverImage}
                alt={collection.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-lg text-slate-400 max-w-2xl">
                  {collection.description}
                </p>
              )}
              <p className="text-sm text-slate-500 mt-4">
                {collection.keyCount} key{collection.keyCount !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={() => followMutation.mutate(collection.id)}
              disabled={followMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
            >
              {followMutation.isPending ? 'Following...' : 'Follow'}
            </button>
          </div>

          {isEditor && (
            <div className="mb-8 p-4 bg-slate-700 rounded-lg border border-slate-600">
              <p className="text-sm text-slate-300">
                Editor mode: You can edit this collection
              </p>
            </div>
          )}

          <div className="space-y-4">
            {collection.keys.map((key, index) => (
              <div
                key={`${key.keyId}-${index}`}
                className="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">
                      Key {key.keyId.substring(0, 8)}...
                    </p>
                    {key.annotation && (
                      <p className="text-sm text-slate-300 mt-1">
                        {key.annotation}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    #{key.order + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default CollectionDetailPage;
