from rest_framework.permissions import BasePermission
class IsOwnerOrReadOnly(BasePermission):
 def has_object_permission(self,request,view,obj): return request.method in ('GET','HEAD','OPTIONS') or obj.owner_id==request.user.id
