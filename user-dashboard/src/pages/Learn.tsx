import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search,
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  DollarSign,
  Code,
  PenTool,
  Briefcase,
  Coins
} from 'lucide-react';

const categories = [
  { id: 'all', name: 'All Courses', icon: BookOpen },
  { id: 'tech', name: 'Tech Skills', icon: Code },
  { id: 'design', name: 'Design', icon: PenTool },
  { id: 'career', name: 'Career Prep', icon: Briefcase },
  { id: 'finance', name: 'Finance', icon: Coins },
];

const courses = [
  {
    id: 1,
    title: 'Budgeting 101 for Students',
    description: 'Master your finances with practical budgeting strategies designed for campus life.',
    category: 'finance',
    instructor: 'Prof. James Mwangi',
    duration: '2 hours',
    lessons: 8,
    students: 1240,
    rating: 4.8,
    price: 'Free',
    image: '/placeholder.svg',
    progress: 0,
  },
  {
    id: 2,
    title: 'CV Writing Masterclass',
    description: 'Create a winning CV that gets you noticed by employers. Includes templates!',
    category: 'career',
    instructor: 'Career Services',
    duration: '1.5 hours',
    lessons: 6,
    students: 890,
    rating: 4.9,
    price: 'Free',
    image: '/placeholder.svg',
    progress: 45,
  },
  {
    id: 3,
    title: 'Flutter for Beginners',
    description: 'Build your first mobile app with Flutter and Dart. No prior experience needed.',
    category: 'tech',
    instructor: 'Tech Club',
    duration: '4 hours',
    lessons: 12,
    students: 567,
    rating: 4.7,
    price: 'KSh 300',
    image: '/placeholder.svg',
    progress: 0,
  },
  {
    id: 4,
    title: 'Freelancing Success Guide',
    description: 'Learn how to start and grow your freelance career while still in school.',
    category: 'career',
    instructor: 'Alumni Network',
    duration: '3 hours',
    lessons: 10,
    students: 432,
    rating: 4.6,
    price: 'KSh 200',
    image: '/placeholder.svg',
    progress: 0,
  },
  {
    id: 5,
    title: 'Graphic Design Essentials',
    description: 'Master Canva, Figma, and basic design principles for stunning visuals.',
    category: 'design',
    instructor: 'Design Club',
    duration: '3.5 hours',
    lessons: 14,
    students: 678,
    rating: 4.8,
    price: 'KSh 250',
    image: '/placeholder.svg',
    progress: 20,
  },
  {
    id: 6,
    title: 'React.js Complete Course',
    description: 'From zero to hero in React. Build real projects and understand modern web development.',
    category: 'tech',
    instructor: 'GDG Zetech',
    duration: '6 hours',
    lessons: 20,
    students: 389,
    rating: 4.9,
    price: 'KSh 500',
    image: '/placeholder.svg',
    progress: 0,
  },
  {
    id: 7,
    title: 'Personal Finance & Investing',
    description: 'Learn to save, invest, and build wealth. Perfect for students starting their financial journey.',
    category: 'finance',
    instructor: 'Finance Club',
    duration: '2.5 hours',
    lessons: 9,
    students: 521,
    rating: 4.7,
    price: 'KSh 150',
    image: '/placeholder.svg',
    progress: 0,
  },
  {
    id: 8,
    title: 'Interview Preparation',
    description: 'Ace your job interviews with confidence. Mock interviews and common questions included.',
    category: 'career',
    instructor: 'Career Services',
    duration: '2 hours',
    lessons: 7,
    students: 945,
    rating: 4.8,
    price: 'Free',
    image: '/placeholder.svg',
    progress: 100,
  },
];

const Learn = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter((course) => {
    const matchesCategory = activeCategory === 'all' || course.category === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const completedCourses = courses.filter(c => c.progress === 100);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Learn & Grow</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Boost your skills with courses designed for students. From budgeting to coding, 
            prepare yourself for success.
          </p>
        </div>

        {/* Progress Summary */}
        {(inProgressCourses.length > 0 || completedCourses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground mb-1">In Progress</p>
              <p className="text-2xl font-bold text-primary">{inProgressCourses.length} courses</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-500">{completedCourses.length} courses</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8 flex justify-center">
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <Icon className="h-4 w-4" />
                  {cat.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="group bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="rounded-full">
                    <Play className="h-5 w-5" />
                  </Button>
                </div>
                <Badge 
                  className="absolute top-3 right-3" 
                  variant={course.price === 'Free' ? 'default' : 'secondary'}
                >
                  {course.price === 'Free' ? 'Free' : <><DollarSign className="h-3 w-3 mr-1" />{course.price}</>}
                </Badge>
              </div>

              <div className="p-4">
                <Badge variant="outline" className="mb-2 capitalize">{course.category}</Badge>
                <h3 className="font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {course.lessons} lessons
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {course.students} students
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    {course.rating}
                  </span>
                </div>

                {course.progress > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>
                )}

                <Button className="w-full" variant={course.progress > 0 ? 'secondary' : 'default'}>
                  {course.progress === 100 ? 'Review' : course.progress > 0 ? 'Continue' : 'Start Learning'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No courses found. Try a different search or category.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Learn;
