-- Migration: Add About page content to admin_settings
-- This migration seeds the about_page_content setting with initial data from the current About page

INSERT INTO admin_settings (key, value, description) VALUES (
  'about_page_content',
  '{
    "hero": {
      "badge": {
        "text": {
          "vi": "Nền tảng cắm trại #1 Việt Nam",
          "en": "Vietnam''''s #1 Camping Platform"
        },
        "icon": "Sparkles"
      },
      "heading": {
        "vi": "Về CampingHub",
        "en": "About CampingHub"
      },
      "description": {
        "vi": "Nền tảng đặt chỗ cắm trại hàng đầu Việt Nam, kết nối bạn với những trải nghiệm thiên nhiên tuyệt vời nhất",
        "en": "Vietnam''''s leading camping reservation platform, connecting you with the best nature experiences"
      }
    },
    "whyChooseUs": {
      "heading": {
        "vi": "Tại sao chọn chúng tôi?",
        "en": "Why Choose Us?"
      },
      "description": {
        "vi": "CampingHub mang đến trải nghiệm đặt phòng tốt nhất với nhiều ưu điểm vượt trội",
        "en": "CampingHub brings the best booking experience with outstanding advantages"
      },
      "cards": [
        {
          "id": "whychoose-1",
          "title": {
            "vi": "Giá tốt nhất",
            "en": "Best Price"
          },
          "description": {
            "vi": "Cam kết giá cạnh tranh nhất thị trường, không phát sinh phí ẩn",
            "en": "Committed to the most competitive market prices, no hidden fees"
          },
          "icon": "BadgeDollarSign",
          "color": "emerald"
        },
        {
          "id": "whychoose-2",
          "title": {
            "vi": "Hỗ trợ 24/7",
            "en": "24/7 Support"
          },
          "description": {
            "vi": "Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn mọi lúc mọi nơi",
            "en": "Support team always ready to help you anytime, anywhere"
          },
          "icon": "Headphones",
          "color": "blue"
        },
        {
          "id": "whychoose-3",
          "title": {
            "vi": "Đặt phòng dễ dàng",
            "en": "Easy Booking"
          },
          "description": {
            "vi": "Chỉ vài bước đơn giản để hoàn tất đặt phòng, tiết kiệm thời gian",
            "en": "Just a few simple steps to complete booking, saving time"
          },
          "icon": "Zap",
          "color": "purple"
        },
        {
          "id": "whychoose-4",
          "title": {
            "vi": "Đánh giá thật",
            "en": "Real Reviews"
          },
          "description": {
            "vi": "100% đánh giá từ khách hàng thực đã trải nghiệm dịch vụ",
            "en": "100% reviews from real customers who have experienced the service"
          },
          "icon": "Star",
          "color": "amber"
        }
      ]
    },
    "story": {
      "heading": {
        "vi": "Câu chuyện của chúng tôi",
        "en": "Our Story"
      },
      "timeline": [
        {
          "id": "timeline-1",
          "type": "year",
          "displayValue": "2024",
          "title": {
            "vi": "Khởi đầu hành trình",
            "en": "Journey Begins"
          },
          "description": {
            "vi": "CampingHub ra đời từ niềm đam mê với thiên nhiên và mong muốn giúp mọi người dễ dàng tìm kiếm và đặt chỗ tại các khu cắm trại chất lượng.",
            "en": "CampingHub was born from a passion for nature and a desire to help people easily find and book quality camping sites."
          },
          "color": "emerald"
        },
        {
          "id": "timeline-2",
          "type": "icon",
          "displayValue": "Users",
          "title": {
            "vi": "Xây dựng cộng đồng",
            "en": "Building Community"
          },
          "description": {
            "vi": "Chúng tôi kết nối chủ campsite đam mê với những gia đình, nhóm bạn yêu thích trải nghiệm ngoài trời.",
            "en": "We connect passionate campsite owners with families and groups who love outdoor experiences."
          },
          "color": "blue"
        },
        {
          "id": "timeline-3",
          "type": "icon",
          "displayValue": "Award",
          "title": {
            "vi": "Cam kết chất lượng",
            "en": "Quality Commitment"
          },
          "description": {
            "vi": "Mỗi campsite đều được kiểm định, đảm bảo tiêu chuẩn dịch vụ và an toàn cho khách hàng.",
            "en": "Each campsite is verified, ensuring service standards and safety for customers."
          },
          "color": "purple"
        }
      ]
    },
    "coreValues": {
      "heading": {
        "vi": "Giá trị cốt lõi",
        "en": "Core Values"
      },
      "values": [
        {
          "id": "value-1",
          "title": {
            "vi": "Đáng tin cậy",
            "en": "Trustworthy"
          },
          "description": {
            "vi": "Minh bạch trong mọi giao dịch và chỉ hợp tác với đối tác uy tín.",
            "en": "Transparent in all transactions and only partnering with reputable partners."
          },
          "icon": "Shield",
          "color": "emerald"
        },
        {
          "id": "value-2",
          "title": {
            "vi": "Tận tâm",
            "en": "Dedicated"
          },
          "description": {
            "vi": "Luôn lắng nghe và hỗ trợ khách hàng trước, trong và sau chuyến đi.",
            "en": "Always listening and supporting customers before, during and after trips."
          },
          "icon": "Heart",
          "color": "blue"
        },
        {
          "id": "value-3",
          "title": {
            "vi": "Bền vững",
            "en": "Sustainable"
          },
          "description": {
            "vi": "Khuyến khích du lịch có trách nhiệm và bảo tồn thiên nhiên địa phương.",
            "en": "Encouraging responsible tourism and preserving local nature."
          },
          "icon": "MapPin",
          "color": "green"
        }
      ]
    },
    "culinary": {
      "badge": {
        "text": {
          "vi": "Trải nghiệm ẩm thực ngoài trời",
          "en": "Outdoor Culinary Experience"
        },
        "icon": "UtensilsCrossed"
      },
      "heading": {
        "vi": "Ẩm thực độc đáo giữa thiên nhiên",
        "en": "Unique Cuisine in Nature"
      },
      "description": {
        "vi": "Mỗi campsite trên CampingHub đều có menu riêng được thiết kế bởi các đầu bếp địa phương, mang đến cảm hứng mới cho những bữa ăn bên lửa trại. Không cần nhìn giá, bạn chỉ cần chọn món theo mood và tận hưởng không khí trong lành.",
        "en": "Each campsite on CampingHub has its own menu designed by local chefs, bringing new inspiration to campfire meals. No need to look at prices, just choose dishes according to your mood and enjoy the fresh air."
      },
      "foodItems": [
        {
          "id": "food-1",
          "title": {
            "vi": "Signature BBQ",
            "en": "Signature BBQ"
          },
          "image": {
            "url": "/images/food/bbq.jpg",
            "public_id": ""
          },
          "badge": {
            "icon": "Flame",
            "text": {
              "vi": "Đặc sản của đầu bếp",
              "en": "Chef special"
            }
          }
        },
        {
          "id": "food-2",
          "title": {
            "vi": "Green Bowl",
            "en": "Green Bowl"
          },
          "image": {
            "url": "/images/food/veggie.jpg",
            "public_id": ""
          },
          "badge": {
            "icon": "Leaf",
            "text": {
              "vi": "Tươi ngon",
              "en": "Fresh pick"
            }
          }
        },
        {
          "id": "food-3",
          "title": {
            "vi": "Coastal Seafood",
            "en": "Coastal Seafood"
          },
          "image": {
            "url": "/images/food/seafood.jpg",
            "public_id": ""
          },
          "badge": {
            "icon": "Flame",
            "text": {
              "vi": "Đặc sản của đầu bếp",
              "en": "Chef special"
            }
          }
        },
        {
          "id": "food-4",
          "title": {
            "vi": "Breakfast on the Hill",
            "en": "Breakfast on the Hill"
          },
          "image": {
            "url": "/images/food/brunch.jpg",
            "public_id": ""
          },
          "badge": {
            "icon": "Leaf",
            "text": {
              "vi": "Tươi ngon",
              "en": "Fresh pick"
            }
          }
        }
      ],
      "features": [
        {
          "id": "feature-1",
          "title": {
            "vi": "Menu theo mùa",
            "en": "Seasonal Menu"
          },
          "description": {
            "vi": "Nguyên liệu bản địa theo mùa giúp giữ trọn hương vị và hỗ trợ cộng đồng địa phương.",
            "en": "Local seasonal ingredients help preserve flavors and support the local community."
          }
        },
        {
          "id": "feature-2",
          "title": {
            "vi": "Workshop nấu ăn",
            "en": "Cooking Workshop"
          },
          "description": {
            "vi": "Các buổi trải nghiệm campfire cooking dành cho nhóm nhỏ hoặc teambuilding.",
            "en": "Campfire cooking experiences for small groups or teambuilding."
          }
        },
        {
          "id": "feature-3",
          "title": {
            "vi": "Không gian linh hoạt",
            "en": "Flexible Space"
          },
          "description": {
            "vi": "Setup dinner trên decking, picnic giữa vườn hoặc BBQ cạnh hồ – tuỳ yêu cầu.",
            "en": "Dinner setup on decking, garden picnic or lakeside BBQ – as requested."
          }
        }
      ]
    },
    "testimonials": {
      "heading": {
        "vi": "Khách hàng nói gì về chúng tôi",
        "en": "What Customers Say"
      },
      "description": {
        "vi": "Những chia sẻ chân thực từ khách hàng đã trải nghiệm dịch vụ",
        "en": "Authentic feedback from customers who have experienced the service"
      },
      "items": [
        {
          "id": "testimonial-1",
          "customerName": {
            "vi": "Nguyễn Văn An",
            "en": "Nguyen Van An"
          },
          "location": {
            "vi": "Đà Lạt, Lâm Đồng",
            "en": "Da Lat, Lam Dong"
          },
          "quote": {
            "vi": "Trải nghiệm cắm trại tuyệt vời! Đặt phòng dễ dàng, campsite đúng như mô tả. Gia đình tôi đã có những kỷ niệm đáng nhớ. Chắc chắn sẽ quay lại!",
            "en": "Amazing camping experience! Easy booking, campsite as described. My family had memorable moments. Will definitely return!"
          },
          "initials": "NA",
          "color": "emerald"
        },
        {
          "id": "testimonial-2",
          "customerName": {
            "vi": "Trần Thị Hương",
            "en": "Tran Thi Huong"
          },
          "location": {
            "vi": "TP. Hồ Chí Minh",
            "en": "Ho Chi Minh City"
          },
          "quote": {
            "vi": "Đặt phòng nhanh chóng, nhân viên hỗ trợ rất nhiệt tình. Giá cả hợp lý và có nhiều địa điểm để lựa chọn. Rất hài lòng!",
            "en": "Quick booking, very enthusiastic support staff. Reasonable prices and many locations to choose from. Very satisfied!"
          },
          "initials": "TH",
          "color": "blue"
        },
        {
          "id": "testimonial-3",
          "customerName": {
            "vi": "Lê Văn Minh",
            "en": "Le Van Minh"
          },
          "location": {
            "vi": "Hà Nội",
            "en": "Hanoi"
          },
          "quote": {
            "vi": "Dịch vụ hỗ trợ rất tốt, giải quyết vấn đề nhanh chóng. Website dễ sử dụng, thông tin chi tiết. Đây là lựa chọn số 1 của tôi!",
            "en": "Very good support service, quick problem solving. Easy-to-use website, detailed information. This is my number 1 choice!"
          },
          "initials": "LM",
          "color": "purple"
        }
      ]
    },
    "cta": {
      "badge": {
        "text": {
          "vi": "Bắt đầu hành trình của bạn",
          "en": "Start Your Journey"
        },
        "icon": "Tent"
      },
      "heading": {
        "vi": "Sẵn sàng khám phá thiên nhiên?",
        "en": "Ready to Explore Nature?"
      },
      "description": {
        "vi": "Hãy bắt đầu hành trình cắm trại của bạn cùng CampingHub ngay hôm nay",
        "en": "Start your camping journey with CampingHub today"
      },
      "primaryButton": {
        "vi": "Tìm kiếm địa điểm",
        "en": "Find Locations"
      },
      "secondaryButton": {
        "vi": "Đăng ký ngay",
        "en": "Sign Up Now"
      }
    }
  }'::jsonb,
  'Nội dung trang About - quản lý toàn bộ text, icon, màu sắc, hình ảnh của trang giới thiệu'
)
ON CONFLICT (key) DO NOTHING;
