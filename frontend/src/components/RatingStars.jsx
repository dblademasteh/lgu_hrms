import React from 'react';
import { Star, StarHalf, Star as StarOutline } from 'lucide-react';

export default function RatingStars({ rating, size = 14 }) {
  if (!rating || rating === '-' || isNaN(Number(rating))) {
    return <span className="text-muted">—</span>;
  }
  const num = Number(rating);
  const fullStars = Math.floor(num);
  const hasHalf = num - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={size} fill="currentColor" className="text-warning" />
      ))}
      {hasHalf && <StarHalf key="half" size={size} fill="currentColor" className="text-warning" />}
      {[...Array(emptyStars)].map((_, i) => (
        <StarOutline key={`empty-${i}`} size={size} className="text-line" />
      ))}
    </div>
  );
}
