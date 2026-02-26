import { Link } from 'react-router-dom';
import { 
  Smartphone, 
  Shirt, 
  BookOpen, 
  Code, 
  Home, 
  Briefcase, 
  GraduationCap, 
  Calendar 
} from 'lucide-react';

const categories = [
  { name: 'Electronics', icon: Smartphone, path: '/marketplace?category=electronics', color: 'bg-blue-500/10 text-blue-500' },
  { name: 'Fashion', icon: Shirt, path: '/marketplace?category=fashion', color: 'bg-pink-500/10 text-pink-500' },
  { name: 'Books', icon: BookOpen, path: '/marketplace?category=books', color: 'bg-amber-500/10 text-amber-500' },
  { name: 'Services', icon: Code, path: '/marketplace?category=services', color: 'bg-purple-500/10 text-purple-500' },
  { name: 'Hostels', icon: Home, path: '/marketplace?category=hostels', color: 'bg-green-500/10 text-green-500' },
  { name: 'Jobs', icon: Briefcase, path: '/opportunities', color: 'bg-cyan-500/10 text-cyan-500' },
  { name: 'Courses', icon: GraduationCap, path: '/learn', color: 'bg-orange-500/10 text-orange-500' },
  { name: 'Events', icon: Calendar, path: '/events', color: 'bg-red-500/10 text-red-500' },
];

const QuickCategories = () => {
  return (
    <section className="py-8 border-b border-border">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Explore by Category</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-2xl mx-auto">Find everything you need in one place - from electronics and books to jobs and courses</p>
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.name}
                to={category.path}
                className="flex flex-col items-center gap-2 min-w-[80px] group"
              >
                <div className={`p-4 rounded-2xl ${category.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickCategories;
