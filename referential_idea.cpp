/* Melody WASM Compiler
 *
 * Copyright (C) 2026 Aria Janke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.

 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// must be compiled in C++20

#include <emscripten.h>

#include <memory>
#include <array>

using UsedPayloadType = std::size_t[];
using UsedPtrType = std::shared_ptr<UsedPayloadType>;

static constexpr std::size_t k_reserved_stack_size = 2 << 16;
alignas(sizeof(std::size_t)*8)
  std::array<std::byte, k_reserved_stack_size>
  k_melody_reserved_space;

extern "C" {

EMSCRIPTEN_KEEPALIVE void * melody_stack_pointer_start()
  { return k_melody_reserved_space.data(); }

EMSCRIPTEN_KEEPALIVE std::size_t melody_sizeof_ref()
  { return sizeof(UsedPtrType); }

EMSCRIPTEN_KEEPALIVE void * melody_create_ref(void * dest, std::size_t size) {
  return new (dest) UsedPtrType{ std::make_shared<UsedPayloadType>(size) };
}

EMSCRIPTEN_KEEPALIVE void * melody_copy_ref(const void * src, void * dest) {
  const auto & source = *reinterpret_cast<const UsedPtrType *>(src);
  return new (dest) UsedPtrType{source};
}

EMSCRIPTEN_KEEPALIVE void melody_destroy_ref(void * target) {
  auto & source = *reinterpret_cast<UsedPtrType *>(target);
  source.~UsedPtrType();
}

} // end of extern "C"