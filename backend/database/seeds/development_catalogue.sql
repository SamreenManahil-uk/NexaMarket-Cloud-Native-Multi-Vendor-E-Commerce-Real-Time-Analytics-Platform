-- Fictional development fixtures only. No real businesses or customer activity.
-- Fixed IDs make reruns insert-only; never reset prices, descriptions, or stock.

INSERT INTO public.users (id,email,password_hash,first_name,last_name,role) VALUES
  ('de000000-0000-4000-8000-100000000001', 'catalogue-seller@example.invalid', '!disabled-development-fixture', 'Development', 'Seller', 'SELLER')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sellers (id,user_id,store_name,store_description) VALUES
  ('de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-100000000001', 'Fictional Demo Store', 'Fictional development seller for NexaMarket catalogue testing only.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id,name,slug,description) VALUES
  ('de000000-0000-4000-8000-300000000001', 'Demo Desk', 'demo-desk', 'Fictional desk catalogue fixtures.'),
  ('de000000-0000-4000-8000-300000000002', 'Demo Home', 'demo-home', 'Fictional home catalogue fixtures.'),
  ('de000000-0000-4000-8000-300000000003', 'Demo Outdoors', 'demo-outdoors', 'Fictional outdoors catalogue fixtures.'),
  ('de000000-0000-4000-8000-300000000004', 'Demo Accessories', 'demo-accessories', 'Fictional accessories catalogue fixtures.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id,seller_id,category_id,name,slug,description,price,image_url) VALUES
  ('de000000-0000-4000-8000-400000000001', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000001', 'Demo Notebook', 'demo-notebook', 'Fictional development product: notebook. Not a real sales listing.', '8.50', NULL),
  ('de000000-0000-4000-8000-400000000002', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000001', 'Demo Desk Lamp', 'demo-desk-lamp', 'Fictional development product: desk lamp. Not a real sales listing.', '29.90', NULL),
  ('de000000-0000-4000-8000-400000000003', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000001', 'Demo Pen Set', 'demo-pen-set', 'Fictional development product: pen set. Not a real sales listing.', '6.25', NULL),
  ('de000000-0000-4000-8000-400000000004', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000002', 'Demo Ceramic Mug', 'demo-ceramic-mug', 'Fictional development product: ceramic mug. Not a real sales listing.', '12.00', NULL),
  ('de000000-0000-4000-8000-400000000005', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000002', 'Demo Cotton Throw', 'demo-cotton-throw', 'Fictional development product: cotton throw. Not a real sales listing.', '34.50', NULL),
  ('de000000-0000-4000-8000-400000000006', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000002', 'Demo Storage Basket', 'demo-storage-basket', 'Fictional development product: storage basket. Not a real sales listing.', '18.75', NULL),
  ('de000000-0000-4000-8000-400000000007', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000003', 'Demo Trail Bottle', 'demo-trail-bottle', 'Fictional development product: trail bottle. Not a real sales listing.', '19.95', NULL),
  ('de000000-0000-4000-8000-400000000008', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000003', 'Demo Picnic Blanket', 'demo-picnic-blanket', 'Fictional development product: picnic blanket. Not a real sales listing.', '27.00', NULL),
  ('de000000-0000-4000-8000-400000000009', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000004', 'Demo Canvas Tote', 'demo-canvas-tote', 'Fictional development product: canvas tote. Not a real sales listing.', '14.00', NULL),
  ('de000000-0000-4000-8000-400000000010', 'de000000-0000-4000-8000-200000000001', 'de000000-0000-4000-8000-300000000004', 'Demo Travel Pouch', 'demo-travel-pouch', 'Fictional development product: travel pouch. Not a real sales listing.', '11.50', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inventory (id,product_id,quantity) VALUES
  ('de000000-0000-4000-8000-500000000001', 'de000000-0000-4000-8000-400000000001', '24'),
  ('de000000-0000-4000-8000-500000000002', 'de000000-0000-4000-8000-400000000002', '8'),
  ('de000000-0000-4000-8000-500000000003', 'de000000-0000-4000-8000-400000000003', '40'),
  ('de000000-0000-4000-8000-500000000004', 'de000000-0000-4000-8000-400000000004', '16'),
  ('de000000-0000-4000-8000-500000000005', 'de000000-0000-4000-8000-400000000005', '6'),
  ('de000000-0000-4000-8000-500000000006', 'de000000-0000-4000-8000-400000000006', '12'),
  ('de000000-0000-4000-8000-500000000007', 'de000000-0000-4000-8000-400000000007', '20'),
  ('de000000-0000-4000-8000-500000000008', 'de000000-0000-4000-8000-400000000008', '0'),
  ('de000000-0000-4000-8000-500000000009', 'de000000-0000-4000-8000-400000000009', '18'),
  ('de000000-0000-4000-8000-500000000010', 'de000000-0000-4000-8000-400000000010', '15')
ON CONFLICT (id) DO NOTHING;

