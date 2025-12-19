// Shared series data for Home and Player pages

export interface Series {
  id: string
  title: string
  poster: string
  tag: string
  tags?: string[]
  description?: string
}

// Featured series for hero section
export const featuredSeries: Series = {
  id: 'featured-1',
  title: 'The Crown of Destiny',
  poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster1.jpg',
  tags: ['Drama', 'Romance', 'Fantasy'],
  description: 'A captivating tale of love, power, and destiny. Follow the journey of a young princess as she navigates the treacherous waters of court politics while discovering her true calling. With stunning visuals and compelling characters, this series will keep you on the edge of your seat.',
  tag: 'Drama'
}

// "You Might Like" section series
export const youMightLikeSeries: Series[] = [
  { id: '1', title: 'Love in the City', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster2.jpg', tag: 'Romance' },
  { id: '2', title: 'Mystery Manor', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster3.jpg', tag: 'Thriller' },
  { id: '3', title: 'Comedy Central', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster4.jpg', tag: 'Comedy' },
  { id: '4', title: 'Action Heroes', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster5.jpg', tag: 'Action' },
  { id: '5', title: 'Fantasy World', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster6.jpg', tag: 'Fantasy' },
  { id: '6', title: 'Historical Drama', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster7.jpg', tag: 'Drama' },
  { id: '7', title: 'Sci-Fi Adventures', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster8.jpg', tag: 'Sci-Fi' },
  { id: '8', title: 'Horror Nights', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster9.jpg', tag: 'Horror' },
]

// "New Releases" section series
export const newReleasesSeries: Series[] = [
  { id: '9', title: 'Fresh Start', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster10.jpg', tag: 'Drama' },
  { id: '10', title: 'New Horizons', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster11.jpg', tag: 'Adventure' },
  { id: '11', title: 'Rising Stars', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster12.jpg', tag: 'Romance' },
  { id: '12', title: 'Breaking Dawn', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster13.jpg', tag: 'Fantasy' },
  { id: '13', title: 'First Light', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster14.jpg', tag: 'Thriller' },
  { id: '14', title: 'New Chapter', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster15.jpg', tag: 'Comedy' },
  { id: '15', title: 'Debut Season', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster16.jpg', tag: 'Action' },
  { id: '16', title: 'Premier Night', poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster17.jpg', tag: 'Drama' },
]

// Complete series database for Player page
export const seriesDatabase: { [key: string]: { title: string; description: string; tags: string[]; poster: string } } = {
  'featured-1': {
    title: 'The Crown of Destiny',
    description: 'A captivating tale of love, power, and destiny. Follow the journey of a young princess as she navigates the treacherous waters of court politics while discovering her true calling.',
    tags: ['Drama', 'Romance', 'Fantasy'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster1.jpg'
  },
  '1': {
    title: 'Love in the City',
    description: 'A heartwarming romantic comedy set in the bustling streets of a modern metropolis. Follow the intertwined lives of young professionals as they navigate love, friendship, and career challenges.',
    tags: ['Romance', 'Comedy', 'Drama'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster2.jpg'
  },
  '2': {
    title: 'Mystery Manor',
    description: 'A gripping thriller that unfolds within the walls of an ancient mansion. Dark secrets, unexpected twists, and a mystery that will keep you guessing until the very end.',
    tags: ['Thriller', 'Mystery', 'Drama'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster3.jpg'
  },
  '3': {
    title: 'Comedy Central',
    description: 'A hilarious comedy series featuring a group of friends navigating the ups and downs of everyday life with humor and heart.',
    tags: ['Comedy', 'Slice of Life'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster4.jpg'
  },
  '4': {
    title: 'Action Heroes',
    description: 'High-octane action and adventure await in this thrilling series. Follow elite warriors as they battle against evil forces threatening the world.',
    tags: ['Action', 'Adventure', 'Sci-Fi'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster5.jpg'
  },
  '5': {
    title: 'Fantasy World',
    description: 'Enter a magical realm where dragons soar and wizards cast powerful spells. An epic fantasy adventure that will transport you to another world.',
    tags: ['Fantasy', 'Adventure', 'Magic'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster6.jpg'
  },
  '6': {
    title: 'Historical Drama',
    description: 'A sweeping historical drama set in ancient times. Experience the rise and fall of empires through the eyes of unforgettable characters.',
    tags: ['Drama', 'History'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster7.jpg'
  },
  '7': {
    title: 'Sci-Fi Adventures',
    description: 'Journey through space and time in this epic science fiction series. Explore distant galaxies and encounter alien civilizations.',
    tags: ['Sci-Fi', 'Adventure'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster8.jpg'
  },
  '8': {
    title: 'Horror Nights',
    description: 'A spine-chilling horror series that will keep you up at night. Face your deepest fears in this terrifying anthology.',
    tags: ['Horror', 'Thriller'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster9.jpg'
  },
  '9': {
    title: 'Fresh Start',
    description: 'A romantic journey of second chances and new beginnings. Watch as characters rediscover love and find their path to happiness.',
    tags: ['Drama', 'Romance'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster10.jpg'
  },
  '10': {
    title: 'New Horizons',
    description: 'An adventure series following explorers as they discover uncharted territories and face incredible challenges.',
    tags: ['Adventure', 'Drama'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster11.jpg'
  },
  '11': {
    title: 'Rising Stars',
    description: 'A romantic drama following aspiring artists as they chase their dreams and find love along the way.',
    tags: ['Romance', 'Drama'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster12.jpg'
  },
  '12': {
    title: 'Breaking Dawn',
    description: 'A fantasy epic about a chosen hero destined to save the world from an ancient evil awakening.',
    tags: ['Fantasy', 'Adventure'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster13.jpg'
  },
  '13': {
    title: 'First Light',
    description: 'A psychological thriller that blurs the line between reality and illusion. Nothing is as it seems.',
    tags: ['Thriller', 'Mystery'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster14.jpg'
  },
  '14': {
    title: 'New Chapter',
    description: 'A heartwarming comedy about starting over and finding joy in unexpected places.',
    tags: ['Comedy', 'Drama'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster15.jpg'
  },
  '15': {
    title: 'Debut Season',
    description: 'An action-packed sports drama following a rookie athlete on their journey to greatness.',
    tags: ['Action', 'Sports', 'Drama'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster16.jpg'
  },
  '16': {
    title: 'Premier Night',
    description: 'A dramatic series set in the world of theater, exploring the lives of performers behind the curtain.',
    tags: ['Drama', 'Arts'],
    poster: 'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/poster17.jpg'
  }
}
